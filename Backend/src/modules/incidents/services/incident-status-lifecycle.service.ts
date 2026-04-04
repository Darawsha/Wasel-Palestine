import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Incident } from '../entities/incident.entity';
import { IncidentStatusHistory } from '../entities/status-history.entity';
import { IncidentStatus } from '../enums/incident-status.enum';

@Injectable()
export class IncidentStatusLifecycleService {
  constructor(
    @InjectRepository(Incident)
    private readonly incidentsRepository: Repository<Incident>,

    @InjectRepository(IncidentStatusHistory)
    private readonly incidentStatusHistoryRepository: Repository<IncidentStatusHistory>,
  ) {}

  applyStatusUpdate(
    incident: Incident,
    nextStatus: IncidentStatus | undefined,
    changedByUserId?: number,
  ): void {
    if (nextStatus === undefined || nextStatus === incident.status) {
      return;
    }

    this.applyStatusSnapshot(incident, nextStatus, changedByUserId);
  }

  applyStatusSnapshot(
    incident: Incident,
    nextStatus: IncidentStatus,
    changedByUserId?: number,
  ): void {
    const changedAt = new Date();
    incident.status = nextStatus;

    if (nextStatus === IncidentStatus.ACTIVE) {
      incident.verifiedByUserId = undefined;
      incident.verifiedAt = undefined;
      incident.closedByUserId = undefined;
      incident.closedAt = undefined;
      return;
    }

    if (nextStatus === IncidentStatus.CLOSED) {
      incident.closedByUserId = changedByUserId;
      incident.closedAt = changedAt;
    }
  }

  async saveIncidentWithHistory(
    incident: Incident,
    previousStatus: IncidentStatus,
    changedByUserId?: number,
  ): Promise<Incident> {
    const hasStatusChange = previousStatus !== incident.status;

    return this.incidentsRepository.manager.transaction(async (manager) => {
      const incidentRepository = manager.getRepository(Incident);
      const savedIncident = await incidentRepository.save(incident);

      if (!hasStatusChange) {
        return savedIncident;
      }

      const incidentStatusHistoryRepository = manager.getRepository(
        IncidentStatusHistory,
      );

      const historyRecord = incidentStatusHistoryRepository.create({
        incident: savedIncident,
        oldStatus: previousStatus,
        newStatus: savedIncident.status,
        changedByUserId,
      });

      await incidentStatusHistoryRepository.save(historyRecord);
      return savedIncident;
    });
  }
}
