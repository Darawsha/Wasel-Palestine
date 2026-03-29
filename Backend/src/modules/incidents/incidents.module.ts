import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { Incident } from './entities/incident.entity';
import { Checkpoint } from '../checkpoints/entities/checkpoint.entity';
import { IncidentStatusHistory } from './entities/status-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Incident, Checkpoint, IncidentStatusHistory])],
  controllers: [IncidentsController],
  providers: [IncidentsService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
