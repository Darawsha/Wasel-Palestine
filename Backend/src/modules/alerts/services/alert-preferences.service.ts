import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { CreateAlertPreferenceDto } from '../dto/create-alert-preference.dto';
import { CreateAlertPreferencesBatchDto } from '../dto/create-alert-preferences-batch.dto';
import { AlertPreference } from '../entities/alert-preference.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { User } from '../../users/entities/user.entity';
import { AlertsValidationService } from './alerts-validation.service';
import { AlertRecordsService } from './alert-records.service';

@Injectable()
export class AlertPreferencesService {
  constructor(
    @InjectRepository(AlertPreference)
    private readonly preferenceRepository: Repository<AlertPreference>,
    private readonly alertsValidationService: AlertsValidationService,
    private readonly alertRecordsService: AlertRecordsService,
  ) {}

  private normalizeAreaForLookup(geographicArea: string): string {
    return String(geographicArea || '')
      .trim()
      .toLowerCase();
  }

  private normalizeCategory(category: string): string {
    return String(category || '')
      .trim()
      .toUpperCase();
  }

  private normalizeCategories(categories: string[]): string[] {
    return Array.from(
      new Set((Array.isArray(categories) ? categories : []).map((category) => this.normalizeCategory(category)).filter(Boolean)),
    );
  }

  private formatCategoryLabel(category: string): string {
    const normalizedCategory = this.normalizeCategory(category);

    switch (normalizedCategory) {
      case 'CLOSURE':
        return 'Road Closure';
      case 'DELAY':
        return 'Delay';
      case 'ACCIDENT':
        return 'Accident';
      case 'WEATHER_HAZARD':
        return 'Weather Hazard';
      default:
        return normalizedCategory
          .toLowerCase()
          .split('_')
          .filter(Boolean)
          .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
          .join(' ');
    }
  }

  private formatCategoryList(categories: string[]): string {
    const labels = this.normalizeCategories(categories).map((category) =>
      this.formatCategoryLabel(category),
    );

    return labels.join(', ');
  }

  private buildUserDisplayName(user?: Partial<User> | null): string {
    const fullName = `${String(user?.firstname || '').trim()} ${String(user?.lastname || '').trim()}`.trim();
    return fullName;
  }

  private async ensureNoDuplicatePreferences(
    manager: EntityManager,
    userId: number,
    geographicArea: string,
    incidentCategories: string[],
  ): Promise<void> {
    const normalizedArea = this.normalizeAreaForLookup(geographicArea);
    const normalizedCategories = this.normalizeCategories(incidentCategories);

    if (normalizedCategories.length === 0) {
      return;
    }

    const duplicates = await manager
      .getRepository(AlertPreference)
      .createQueryBuilder('preference')
      .where('preference.userId = :userId', { userId })
      .andWhere('LOWER(TRIM(preference.geographicArea)) = :geographicArea', {
        geographicArea: normalizedArea,
      })
      .andWhere('preference.incidentCategory IN (:...incidentCategories)', {
        incidentCategories: normalizedCategories,
      })
      .andWhere('preference.isActive = :isActive', { isActive: true })
      .getMany();

    if (duplicates.length === 0) {
      return;
    }

    if (duplicates.length === 1 && normalizedCategories.length === 1) {
      throw new BadRequestException(
        'You are already subscribed to this area and category.',
      );
    }

    throw new BadRequestException(
      'You are already subscribed to one or more selected categories for this area.',
    );
  }

  private async createAdminSubscriptionNotification(
    manager: EntityManager,
    actorUserId: number,
    preferences: AlertPreference[],
  ): Promise<void> {
    if (!Array.isArray(preferences) || preferences.length === 0) {
      return;
    }

    const userRepository = manager.getRepository(User);
    const actor = await userRepository.findOne({
      where: { id: actorUserId },
    });
    const adminUsers = await userRepository.find({
      where: { role: UserRole.ADMIN },
    });
    const adminIds = adminUsers
      .map((user) => Number(user.id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (adminIds.length === 0) {
      return;
    }

    const displayName = this.buildUserDisplayName(actor);
    const actorLabel = displayName || 'A user';
    const geographicArea = String(preferences[0]?.geographicArea || '').trim() || 'the selected location';
    const categoryList = this.formatCategoryList(
      preferences.map((preference) => preference.incidentCategory),
    );
    const referenceId = preferences[0]?.id || 'pending';
    const message = `${actorLabel} added an alert subscription for ${categoryList} in ${geographicArea}.`;

    await this.alertRecordsService.createPendingRecordsForSubscribers(
      adminIds,
      `subscription:${referenceId}`,
      message,
      {
        title: 'New Alert Subscription',
        summary: message,
        senderName: displayName || null,
      },
      manager,
    );
  }

  async subscribeToArea(userId: number, dto: CreateAlertPreferenceDto) {
    const validatedUserId = this.alertsValidationService.ensureValidUserId(userId);

    return this.preferenceRepository.manager.transaction(async (manager) => {
      const preferenceRepository = manager.getRepository(AlertPreference);

      // Mohammad's Addition: Check for existing preference and return it if found
      const existing = await preferenceRepository
        .createQueryBuilder('preference')
        .where('preference.userId = :userId', { userId: validatedUserId })
        .andWhere('LOWER(TRIM(preference.geographicArea)) = :geographicArea', {
          geographicArea: this.normalizeAreaForLookup(dto.geographicArea),
        })
        .andWhere('preference.incidentCategory = :incidentCategory', {
          incidentCategory: this.normalizeCategory(dto.incidentCategory),
        })
        .andWhere('preference.isActive = :isActive', { isActive: true })
        .getOne();

      if (existing) {
        return existing;
      }

      await this.ensureNoDuplicatePreferences(
        manager,
        validatedUserId,
        dto.geographicArea,
        [dto.incidentCategory],
      );

      const newPreference = preferenceRepository.create({
        userId: validatedUserId,
        geographicArea: dto.geographicArea,
        incidentCategory: this.normalizeCategory(dto.incidentCategory),
      });

      const savedPreference = await preferenceRepository.save(newPreference);

      // Montaser's Addition: Send admin notification upon successful save
      await this.createAdminSubscriptionNotification(
        manager,
        validatedUserId,
        [savedPreference],
      );

      return savedPreference;
    });
  }

  async subscribeToAreas(
    userId: number,
    dto: CreateAlertPreferencesBatchDto,
  ): Promise<AlertPreference[]> {
    const validatedUserId = this.alertsValidationService.ensureValidUserId(userId);

    return this.preferenceRepository.manager.transaction(async (manager) => {
      const preferenceRepository = manager.getRepository(AlertPreference);
      const normalizedCategories = this.normalizeCategories(dto.incidentCategories);

      await this.ensureNoDuplicatePreferences(
        manager,
        validatedUserId,
        dto.geographicArea,
        normalizedCategories,
      );

      const newPreferences = normalizedCategories.map((incidentCategory) =>
        preferenceRepository.create({
          userId: validatedUserId,
          geographicArea: dto.geographicArea,
          incidentCategory,
        }),
      );

      const savedPreferences = await preferenceRepository.save(newPreferences);

      await this.createAdminSubscriptionNotification(
        manager,
        validatedUserId,
        savedPreferences,
      );

      return savedPreferences;
    });
  }

  async getUserPreferences(userId: number) {
    const validatedUserId = this.alertsValidationService.ensureValidUserId(userId);

    return this.preferenceRepository.find({
      where: { userId: validatedUserId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async unsubscribe(userId: number, preferenceId: string) {
    const validatedUserId = this.alertsValidationService.ensureValidUserId(userId);

    const preference = await this.preferenceRepository.findOne({
      where: { id: preferenceId, userId: validatedUserId },
    });
    if (!preference) {
      return { message: 'Successfully unsubscribed' };
    }

    await this.preferenceRepository.remove(preference);
    return { message: 'Successfully deleted subscription' };
  }

  async findActiveSubscribers(geographicArea: string, category: string) {
    const normalizedArea = this.normalizeAreaForLookup(geographicArea);

    return this.preferenceRepository
      .createQueryBuilder('preference')
      .where('LOWER(TRIM(preference.geographicArea)) = :geographicArea', {
        geographicArea: normalizedArea,
      })
      .andWhere('preference.incidentCategory = :incidentCategory', {
        incidentCategory: String(category || '').trim().toUpperCase(),
      })
      .andWhere('preference.isActive = :isActive', { isActive: true })
      .getMany();
  }
}