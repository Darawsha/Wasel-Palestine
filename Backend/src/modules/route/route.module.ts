import { Module } from '@nestjs/common';
import { RouteController } from './route.controller';
import { RouteService } from './route.service';
import { OpenRouteRoutingProvider } from './providers/openroute-routing.provider';
import { CheckpointAvoidanceStrategy } from './strategies/checkpoint-avoidance.strategy';
import { RestrictedAreaAvoidanceStrategy } from './strategies/restricted-area-avoidance.strategy';
import { RouteMetadataService } from './services/route-metadata.service';
import { CheckpointsModule } from '../checkpoints/checkpoints.module';

@Module({
  imports: [CheckpointsModule],
  controllers: [RouteController],
  providers: [
    RouteService,
    OpenRouteRoutingProvider,
    CheckpointAvoidanceStrategy,
    RestrictedAreaAvoidanceStrategy,
    RouteMetadataService,
  ],
})
export class RouteModule {}