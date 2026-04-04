import { CheckpointStatus } from '../../modules/checkpoints/enums/checkpoint-status.enum';
import { IncidentSeverity } from '../../modules/incidents/enums/incident-severity.enum';
import { IncidentType } from '../../modules/incidents/enums/incident-type.enum';

export enum IncidentAlertTrigger {
  VERIFIED_ACTIVE = 'VERIFIED_ACTIVE',
  RESOLVED = 'RESOLVED',
}

export class IncidentAlertEvent {
  incidentId: string;
  trigger: IncidentAlertTrigger;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  geographicArea: string;
  description: string;
  checkpointName?: string | null;
  impactStatus?: CheckpointStatus | null;
}
