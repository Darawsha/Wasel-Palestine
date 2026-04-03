import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateAlertPreferenceDto } from '../dto/create-alert-preference.dto';
import { AlertPreference } from '../entities/alert-preference.entity';
import { AlertsValidationService } from './alerts-validation.service';

@Injectable()
export class AlertPreferencesService {
  constructor(
    @InjectRepository(AlertPreference)
    private readonly preferenceRepository: Repository<AlertPreference>,
    private readonly alertsValidationService: AlertsValidationService,
  ) {}

  async subscribeToArea(userId: number, dto: CreateAlertPreferenceDto) {
    const validatedUserId = this.alertsValidationService.ensureValidUserId(userId);

    const existing = await this.preferenceRepository.findOne({
      where: {
        userId: validatedUserId,
        geographicArea: dto.geographicArea,
        incidentCategory: dto.incidentCategory,
        isActive: true,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'You are already subscribed to this area and category.',
      );
    }

    const newPreference = this.preferenceRepository.create({
      userId: validatedUserId,
      geographicArea: dto.geographicArea,
      incidentCategory: dto.incidentCategory,
    });

    return this.preferenceRepository.save(newPreference);
  }

  async getUserPreferences(userId: number) {
    const validatedUserId = this.alertsValidationService.ensureValidUserId(userId);

    return this.preferenceRepository.find({
      where: { userId: validatedUserId, isActive: true },
    });
  }

  async unsubscribe(userId: number, preferenceId: string) {
    const validatedUserId = this.alertsValidationService.ensureValidUserId(userId);

    const preference = await this.preferenceRepository.findOne({
      where: { id: preferenceId, userId: validatedUserId },
    });
    if (!preference) {
      throw new NotFoundException('Subscription not found');
    }

    preference.isActive = false;
    await this.preferenceRepository.save(preference);
    return { message: 'Successfully unsubscribed' };
  }

  async findActiveSubscribers(geographicArea: string, category: string) {
    return this.preferenceRepository.find({
      where: {
        geographicArea,
        incidentCategory: category,
        isActive: true,
      },
    });
  }
}
