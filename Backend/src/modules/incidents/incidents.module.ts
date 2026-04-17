import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { Incident } from './entities/incident.entity';
import { Checkpoint } from '../checkpoints/entities/checkpoint.entity';
import { IncidentStatusHistory } from './entities/status-history.entity';
import { IncidentQueryStrategyService } from './services/incident-query-strategy.service';
import { IncidentUpdateStrategyService } from './services/incident-update-strategy.service';
import { IncidentStatusLifecycleService } from './services/incident-status-lifecycle.service';
import { IncidentAlertObserver } from './observers/incident-created.observer';
import { CheckpointStatusHistory } from '../checkpoints/entities/status-history.entity';
import { IncidentCheckpointSyncService } from './sync/incident-checkpoint-sync.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Incident,
      Checkpoint,
      IncidentStatusHistory,
      CheckpointStatusHistory,
    ]),
    AuditLogModule,
  ],
  controllers: [IncidentsController],
  providers: [
    IncidentsService,
    IncidentQueryStrategyService,
    IncidentUpdateStrategyService,
    IncidentStatusLifecycleService,
    IncidentAlertObserver,
    IncidentCheckpointSyncService,
  ],
  exports: [IncidentsService],
})
export class IncidentsModule {}
