import { Module } from '@nestjs/common';

import { CheckpointsModule } from '../checkpoints/checkpoints.module';
import { IncidentsModule } from '../incidents/incidents.module';
import { MapController } from './map.controller';

@Module({
  imports: [IncidentsModule, CheckpointsModule],
  controllers: [MapController],
})
export class MapModule {}