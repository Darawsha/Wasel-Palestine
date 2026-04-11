import { Module } from '@nestjs/common';
import { RouteController } from './route.controller';
import { RouteService } from './route.service';
import { OpenRouteRoutingProvider } from './providers/openroute-routing.provider';
import { LocationIqRoutingProvider } from './providers/locationiq-routing.provider';
import { CheckpointAvoidanceStrategy } from './strategies/checkpoint-avoidance.strategy';
import { IncidentAvoidanceStrategy } from './strategies/incident-avoidance.strategy';
import { RouteMetadataService } from './services/route-metadata.service';
import { RouteRecommendationService } from './services/route-recommendation.service';
import { CheckpointsModule } from '../checkpoints/checkpoints.module';
import { IncidentsModule } from '../incidents/incidents.module';

@Module({
  imports: [CheckpointsModule, IncidentsModule],
  controllers: [RouteController],
  providers: [
    RouteService,
    OpenRouteRoutingProvider,
    LocationIqRoutingProvider,
    CheckpointAvoidanceStrategy,
    IncidentAvoidanceStrategy,
    RouteMetadataService,
    RouteRecommendationService,
  ],
})
export class RouteModule {}
