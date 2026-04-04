import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Incident } from '../entities/incident.entity';
import {
  IncidentAlertEvent,
  IncidentAlertTrigger,
} from '../../../common/events/incident-created.event';

@Injectable()
export class IncidentAlertObserver {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  notifyIncidentVerified(incident: Incident): void {
    const event: IncidentAlertEvent = {
      incidentId: String(incident.id),
      trigger: IncidentAlertTrigger.VERIFIED_ACTIVE,
      incidentType: incident.type,
      severity: incident.severity,
      geographicArea: incident.location || 'Unknown area',
      description: incident.description,
      checkpointName: incident.checkpoint?.name ?? null,
      impactStatus: incident.impactStatus ?? null,
    };

    this.eventEmitter.emit('incident.verified', event);
  }

  notifyIncidentResolved(incident: Incident): void {
    const event: IncidentAlertEvent = {
      incidentId: String(incident.id),
      trigger: IncidentAlertTrigger.RESOLVED,
      incidentType: incident.type,
      severity: incident.severity,
      geographicArea: incident.location || 'Unknown area',
      description: incident.description,
      checkpointName: incident.checkpoint?.name ?? null,
      impactStatus: incident.impactStatus ?? null,
    };

    this.eventEmitter.emit('incident.resolved', event);
  }
}
