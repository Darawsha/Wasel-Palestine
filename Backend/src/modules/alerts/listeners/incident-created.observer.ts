import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { IncidentAlertEvent } from '../../../common/events/incident-created.event';
import { AlertNotificationService } from '../services/alert-notification.service';

@Injectable()
export class IncidentAlertListener {
  constructor(
    private readonly alertNotificationService: AlertNotificationService,
  ) {}

  @OnEvent('incident.verified')
  async handleVerified(event: IncidentAlertEvent) {
    await this.alertNotificationService.processIncidentVerified(event);
  }

  @OnEvent('incident.resolved')
  async handleResolved(event: IncidentAlertEvent) {
    await this.alertNotificationService.processIncidentResolved(event);
  }
}
