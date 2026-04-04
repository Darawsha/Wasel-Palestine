import { Injectable, Logger } from '@nestjs/common';

import {
  IncidentAlertEvent,
  IncidentAlertTrigger,
} from '../../../common/events/incident-created.event';
import { AlertPreferencesService } from './alert-preferences.service';
import { AlertRecordsService } from './alert-records.service';
import { CheckpointStatus } from '../../checkpoints/enums/checkpoint-status.enum';

@Injectable()
export class AlertNotificationService {
  private readonly logger = new Logger(AlertNotificationService.name);

  constructor(
    private readonly alertPreferencesService: AlertPreferencesService,
    private readonly alertRecordsService: AlertRecordsService,
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

    const messageBody = this.buildMessageBody(event);
    const createdCount = await this.alertRecordsService.createPendingRecordsForSubscribers(
      subscribers.map((subscriber) => subscriber.userId),
      incidentId,
      messageBody,
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
