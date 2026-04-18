import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import { Checkpoint } from '../../checkpoints/entities/checkpoint.entity';
import { Incident } from '../../incidents/entities/incident.entity';
import { IncidentStatus } from '../../incidents/enums/incident-status.enum';
import { IncidentType } from '../../incidents/enums/incident-type.enum';
import { Report } from '../../reports/entities/report.entity';
import { ReportStatus } from '../../reports/enums/report-status.enum';
import { AlertPreference } from '../entities/alert-preference.entity';
import { AlertsValidationService } from './alerts-validation.service';
import { PUBLIC_MODERATION_STATUSES } from '../../../common/enums/moderation-status.enum';
import { User } from '../../users/entities/user.entity';
import {
  formatCheckpointStatusLabel,
  formatIncidentCategoryLabel,
  getCheckpointStatusesForIncidentTypes,
  getReportCategoriesForIncidentTypes,
  matchesCheckpointCategory,
  matchesReportCategory,
  normalizeIncidentCategory,
} from '../utils/alert-category.util';

type AlertPreferenceGroup = {
  key: string;
  location: string;
  preferenceIds: string[];
  categories: { key: string }[];
  subscribedSince: Date | null;
  lastCreatedAt: Date | null;
};

type AlertMatchRecord = {
  id: string;
  sourceRecordId: string;
  sourceType: 'checkpoint' | 'incident' | 'report';
  title: string;
  summary: string;
  location: string;
  categoryKey: string;
  statusKey: string | null;
  severityKey: string | null;
  isVerified: boolean | null;
  createdAt: Date | null;
};

type AlertUnreadMatchSummary = {
  unreadCount: number;
  lastAlertsViewedAt: Date | null;
  unreadMatchIds: string[];
};

@Injectable()
export class AlertMatchesService {
  constructor(
    @InjectRepository(AlertPreference)
    private readonly preferenceRepository: Repository<AlertPreference>,
    @InjectRepository(Checkpoint)
    private readonly checkpointsRepository: Repository<Checkpoint>,
    @InjectRepository(Incident)
    private readonly incidentsRepository: Repository<Incident>,
    @InjectRepository(Report)
    private readonly reportsRepository: Repository<Report>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly alertsValidationService: AlertsValidationService,
  ) {}

  async getUserAlertOverview(userId: number) {
    const validatedUserId = this.alertsValidationService.ensureValidUserId(userId);
    const preferences = await this.preferenceRepository.find({
      where: { userId: validatedUserId, isActive: true },
      order: { createdAt: 'DESC' },
    });

    const groupedPreferences = this.groupPreferences(preferences);
    if (groupedPreferences.length === 0) {
      return [];
    }

    const incidentCategories = this.getUniqueIncidentCategories(groupedPreferences);
    const [candidateIncidents, candidateCheckpoints, candidateReports] =
      await Promise.all([
        this.loadCandidateIncidents(incidentCategories),
        this.loadCandidateCheckpoints(incidentCategories),
        this.loadCandidateReports(incidentCategories),
      ]);

    return groupedPreferences.map((group) => {
      const currentMatches = this.buildCurrentMatches(group, {
        incidents: candidateIncidents,
        checkpoints: candidateCheckpoints,
        reports: candidateReports,
      });

      return {
        key: group.key,
        location: group.location,
        preferenceIds: group.preferenceIds,
        categories: group.categories,
        subscribedSince: group.subscribedSince,
        currentMatches,
        matchCount: currentMatches.length,
      };
    });
  }

  async getUnreadMatchesCount(userId: number): Promise<AlertUnreadMatchSummary> {
    const user = await this.findUserForAlertState(userId);
    const lastViewedAt = user.lastAlertsViewedAt ?? null;
    const lastViewedTime = this.toTimeValue(lastViewedAt, 0);
    const overview = await this.getUserAlertOverview(user.id);
    const seenMatchIds = new Set<string>();
    const unreadMatchIds = new Set<string>();
    let unreadCount = 0;

    overview.forEach((subscription) => {
      subscription.currentMatches
        .forEach((match) => {
          if (seenMatchIds.has(match.id)) {
            return;
          }

          seenMatchIds.add(match.id);

          if (this.toTimeValue(match.createdAt, 0) > lastViewedTime) {
            unreadCount += 1;
            unreadMatchIds.add(match.id);
          }
        });
    });

    return {
      unreadCount,
      lastAlertsViewedAt: lastViewedAt,
      unreadMatchIds: Array.from(unreadMatchIds),
    };
  }

  async markAllMatchesViewed(userId: number) {
    const user = await this.findUserForAlertState(userId);
    user.lastAlertsViewedAt = new Date();
    await this.usersRepository.save(user);

    return {
      unreadCount: 0,
      lastAlertsViewedAt: user.lastAlertsViewedAt,
    };
  }

  private async findUserForAlertState(userId: number): Promise<User> {
    const validatedUserId = this.alertsValidationService.ensureValidUserId(userId);
    const user = await this.usersRepository.findOne({
      where: { id: validatedUserId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private groupPreferences(preferences: AlertPreference[]): AlertPreferenceGroup[] {
    const groups = new Map<string, AlertPreferenceGroup>();

    preferences.forEach((preference) => {
      const location = this.normalizeLocationText(preference.geographicArea);
      const key = location.toLowerCase();
      const existingGroup = groups.get(key);

      if (!existingGroup) {
        groups.set(key, {
          key,
          location: preference.geographicArea,
          preferenceIds: [preference.id],
          categories: [{ key: normalizeIncidentCategory(preference.incidentCategory) }],
          subscribedSince: preference.createdAt ?? null,
          lastCreatedAt: preference.createdAt ?? null,
        });
        return;
      }

      existingGroup.preferenceIds.push(preference.id);

      const categoryKey = normalizeIncidentCategory(preference.incidentCategory);
      if (!existingGroup.categories.some((category) => category.key === categoryKey)) {
        existingGroup.categories.push({ key: categoryKey });
      }

      if (
        this.toTimeValue(preference.createdAt, Number.POSITIVE_INFINITY) <
        this.toTimeValue(existingGroup.subscribedSince, Number.POSITIVE_INFINITY)
      ) {
        existingGroup.subscribedSince = preference.createdAt ?? null;
      }

      if (
        this.toTimeValue(preference.createdAt, 0) >
        this.toTimeValue(existingGroup.lastCreatedAt, 0)
      ) {
        existingGroup.lastCreatedAt = preference.createdAt ?? null;
      }
    });

    return Array.from(groups.values()).sort(
      (left, right) =>
        this.toTimeValue(right.lastCreatedAt, 0) -
        this.toTimeValue(left.lastCreatedAt, 0),
    );
  }

  private getUniqueIncidentCategories(groups: AlertPreferenceGroup[]): IncidentType[] {
    return Array.from(
      new Set(
        groups.flatMap((group) =>
          group.categories.map((category) =>
            normalizeIncidentCategory(category.key),
          ),
        ),
      ),
    ).filter((category): category is IncidentType =>
      Object.values(IncidentType).includes(category as IncidentType),
    );
  }

  private async loadCandidateIncidents(categories: IncidentType[]) {
    if (categories.length === 0) {
      return [];
    }

    return this.incidentsRepository.find({
      where: {
        type: In(categories),
        status: IncidentStatus.ACTIVE,
        isVerified: true,
        moderationStatus: In(PUBLIC_MODERATION_STATUSES),
      },
      relations: {
        checkpoint: true,
      },
      order: {
        updatedAt: 'DESC',
      },
    });
  }

  private async loadCandidateCheckpoints(categories: IncidentType[]) {
    const statuses = getCheckpointStatusesForIncidentTypes(categories);

    if (statuses.length === 0) {
      return [];
    }

    return this.checkpointsRepository.find({
      where: {
        currentStatus: In(statuses),
        moderationStatus: In(PUBLIC_MODERATION_STATUSES),
      },
      order: {
        updatedAt: 'DESC',
      },
    });
  }

  private async loadCandidateReports(categories: IncidentType[]) {
    const reportCategories = getReportCategoriesForIncidentTypes(categories);

    if (reportCategories.length === 0) {
      return [];
    }

    return this.reportsRepository.find({
      where: {
        status: ReportStatus.APPROVED,
        category: In(reportCategories),
        duplicateOf: IsNull(),
      },
      order: {
        updatedAt: 'DESC',
      },
    });
  }

  private buildCurrentMatches(
    group: AlertPreferenceGroup,
    candidates: {
      incidents: Incident[];
      checkpoints: Checkpoint[];
      reports: Report[];
    },
  ): AlertMatchRecord[] {
    const categoryKeys = group.categories.map((category) =>
      normalizeIncidentCategory(category.key),
    );

    const incidentMatches = candidates.incidents
      .filter(
        (incident) =>
          categoryKeys.includes(normalizeIncidentCategory(incident.type)) &&
          this.isLocationMatch(group.location, [
            incident.location,
            incident.checkpoint?.name,
            incident.checkpoint?.location,
          ]),
      )
      .map((incident) => this.mapIncidentMatch(incident));

    const checkpointMatches = candidates.checkpoints
      .filter(
        (checkpoint) =>
          categoryKeys.some((category) =>
            matchesCheckpointCategory(category, checkpoint.currentStatus),
          ) &&
          this.isLocationMatch(group.location, [
            checkpoint.name,
            checkpoint.location,
          ]),
      )
      .map((checkpoint) =>
        this.mapCheckpointMatch(
          checkpoint,
          categoryKeys.find((category) =>
            matchesCheckpointCategory(category, checkpoint.currentStatus),
          ) || IncidentType.CLOSURE,
        ),
      );

    const reportMatches = candidates.reports
      .filter(
        (report) =>
          categoryKeys.some((category) =>
            matchesReportCategory(category, report.category),
          ) &&
          this.isLocationMatch(group.location, [report.location]),
      )
      .map((report) =>
        this.mapReportMatch(
          report,
          categoryKeys.find((category) =>
            matchesReportCategory(category, report.category),
          ) || IncidentType.CLOSURE,
        ),
      );

    return [...incidentMatches, ...checkpointMatches, ...reportMatches].sort(
      (left, right) =>
        this.toTimeValue(right.createdAt, 0) - this.toTimeValue(left.createdAt, 0),
    );
  }

  private mapIncidentMatch(incident: Incident): AlertMatchRecord {
    const categoryKey = normalizeIncidentCategory(incident.type);
    const location =
      String(incident.location || incident.checkpoint?.location || '').trim() ||
      'Unknown location';
    const subject =
      String(incident.checkpoint?.name || incident.location || incident.title).trim() ||
      'This location';
    const label = formatIncidentCategoryLabel(categoryKey).toLowerCase();

    return {
      id: `incident:${incident.id}`,
      sourceRecordId: String(incident.id),
      sourceType: 'incident',
      title: incident.title || `${formatIncidentCategoryLabel(categoryKey)} Incident`,
      summary: `${subject} currently has a verified ${label} incident.`,
      location,
      categoryKey,
      statusKey: String(incident.status || '').trim() || null,
      severityKey: String(incident.severity || '').trim().toUpperCase() || null,
      isVerified: Boolean(incident.isVerified),
      createdAt: incident.updatedAt ?? incident.createdAt ?? null,
    };
  }

  private mapCheckpointMatch(
    checkpoint: Checkpoint,
    categoryKey: IncidentType,
  ): AlertMatchRecord {
    const statusLabel = formatCheckpointStatusLabel(checkpoint.currentStatus);

    return {
      id: `checkpoint:${checkpoint.id}`,
      sourceRecordId: String(checkpoint.id),
      sourceType: 'checkpoint',
      title: checkpoint.name || 'Checkpoint Match',
      summary: `${checkpoint.name || 'This checkpoint'} is currently ${statusLabel.toLowerCase()}.`,
      location:
        String(checkpoint.location || checkpoint.name || '').trim() ||
        'Unknown location',
      categoryKey,
      statusKey: String(checkpoint.currentStatus || '').trim() || null,
      severityKey: null,
      isVerified: null,
      createdAt: checkpoint.updatedAt ?? checkpoint.createdAt ?? null,
    };
  }

  private mapReportMatch(report: Report, categoryKey: IncidentType): AlertMatchRecord {
    const label = formatIncidentCategoryLabel(categoryKey).toLowerCase();

    return {
      id: `report:${report.reportId}`,
      sourceRecordId: String(report.reportId),
      sourceType: 'report',
      title: 'Approved Community Report',
      summary: `${report.location || 'This location'} has an approved ${label} community report.`,
      location: String(report.location || '').trim() || 'Unknown location',
      categoryKey,
      statusKey: String(report.status || '').trim().toUpperCase() || null,
      severityKey: null,
      isVerified: null,
      createdAt: report.updatedAt ?? report.createdAt ?? null,
    };
  }

  private normalizeLocationText(value: string): string {
    return String(value || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isLocationMatch(location: string, candidates: Array<unknown>): boolean {
    const normalizedLocation = this.normalizeLocationText(location);

    if (!normalizedLocation) {
      return false;
    }

    return candidates.some((candidate) => {
      const normalizedCandidate = this.normalizeLocationText(String(candidate || ''));

      if (!normalizedCandidate) {
        return false;
      }

      return (
        normalizedCandidate.includes(normalizedLocation) ||
        normalizedLocation.includes(normalizedCandidate)
      );
    });
  }

  private toTimeValue(dateValue: Date | null | undefined, fallback: number): number {
    const timestamp = dateValue ? new Date(dateValue).getTime() : Number.NaN;
    return Number.isFinite(timestamp) ? timestamp : fallback;
  }
}
