import { Module } from '@nestjs/common';

import { CheckpointsModule } from '../checkpoints/checkpoints.module';
import { IncidentsModule } from '../incidents/incidents.module';
import { ReportsModule } from '../reports/reports.module';
import { MapController } from './map.controller';

@Module({
  imports: [IncidentsModule, CheckpointsModule, ReportsModule],
  controllers: [MapController],
})
export class MapModule {}
