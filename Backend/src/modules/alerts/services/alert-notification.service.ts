import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  IncidentAlertEvent,
  IncidentAlertTrigger,
} from '../../../common/events/incident-created.event';
import { AlertPreferencesService } from './alert-preferences.service';
import { AlertRecordsService } from './alert-records.service';
import { CheckpointStatus } from '../../checkpoints/enums/checkpoint-status.enum';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class AlertNotificationService {
  private readonly logger = new Logger(AlertNotificationService.name);

  constructor(
    private readonly alertPreferencesService: AlertPreferencesService,
    private readonly alertRecordsService: AlertRecordsService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async processIncidentVerified(event: IncidentAlertEvent) {
    return this.processIncidentAlert(event);
  }

  async processIncidentResolved(event: IncidentAlertEvent) {
    return this.processIncidentAlert(event);
  }

  private async processIncidentAlert(event: IncidentAlertEvent) {
    const incidentId = String(event.incidentId || '').trim();
    if (!incidentId) return;

    const geographicArea = event.geographicArea || 'Unknown area';
    const category = event.incidentType || 'General';

    this.logger.log(
      `Incident alert (${event.trigger}) detected in ${geographicArea}. Finding matching subscribers...`,
    );

    const subscribers = await this.alertPreferencesService.findActiveSubscribers(
      geographicArea,
      category,
    );

    if (subscribers.length === 0) {
      this.logger.log(
        `No subscribers found for area ${geographicArea} & category ${category}.`,
      );
      return;
    }

    const senderName = await this.resolveSenderName(event.actorUserId);
    const messageBody = this.buildMessageBody(event);
    const title = this.buildNotificationTitle(event);
    const summary = this.buildNotificationSummary(event);
    const createdCount = await this.alertRecordsService.createPendingRecordsForSubscribers(
      subscribers.map((subscriber) => subscriber.userId),
      incidentId,
      messageBody,
      {
        title,
        summary,
        senderName,
      },
    );

    this.logger.log(
      `Successfully generated 1 message and ${createdCount} alert records.`,
    );
  }

  private buildMessageBody(event: IncidentAlertEvent): string {
    const severityLabel = this.formatLabel(event.severity);
    const typeLabel = this.formatLabel(event.incidentType);
    const checkpointName = String(event.checkpointName || '').trim();
    const impactLabel = event.impactStatus
      ? this.formatCheckpointStatusLabel(event.impactStatus)
      : null;
    const geographicArea = event.geographicArea || 'Unknown area';
    const description = event.description || 'No details provided.';

    if (event.trigger === IncidentAlertTrigger.RESOLVED) {
      if (checkpointName) {
        return `Resolved: The ${typeLabel} incident affecting ${checkpointName} has been resolved. The checkpoint is now ${this.formatCheckpointStatusLabel(CheckpointStatus.ACTIVE)}.`;
      }

      return `Resolved: The ${typeLabel} incident in ${geographicArea} has been resolved.`;
    }

    if (checkpointName && impactLabel) {
      return `Alert: A ${severityLabel} ${typeLabel} incident has caused ${checkpointName} to be ${impactLabel}. Description: ${description}`;
    }

    return `Alert: A ${severityLabel} ${typeLabel} incident has been verified in ${geographicArea}. Description: ${description}`;
  }

  private buildNotificationTitle(event: IncidentAlertEvent): string {
    if (event.trigger === IncidentAlertTrigger.RESOLVED) {
      return 'Incident Resolved';
    }

    return `${this.formatLabel(event.severity)} Severity Incident`;
  }

  private buildNotificationSummary(event: IncidentAlertEvent): string {
    const typeLabel = this.formatLabel(event.incidentType).toLowerCase();
    const subject = String(event.checkpointName || event.geographicArea || 'This area').trim();

    if (event.trigger === IncidentAlertTrigger.RESOLVED) {
      return `${subject} ${typeLabel} incident has been resolved.`;
    }

    return `${subject} has a verified ${typeLabel} incident.`;
  }

  private async resolveSenderName(actorUserId?: number | null): Promise<string> {
    if (!Number.isInteger(actorUserId) || Number(actorUserId) <= 0) {
      return 'Admin Team';
    }

    const user = await this.usersRepository.findOne({
      where: { id: Number(actorUserId) },
      select: {
        id: true,
        firstname: true,
        lastname: true,
      },
    });

    const fullName = `${String(user?.firstname || '').trim()} ${String(user?.lastname || '').trim()}`.trim();
    return fullName || 'Admin Team';
  }

  private formatLabel(value: string): string {
    return String(value || '')
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  private formatCheckpointStatusLabel(status: CheckpointStatus): string {
    if (status === CheckpointStatus.ACTIVE) {
      return 'Open';
    }

    return this.formatLabel(status);
  }
}
