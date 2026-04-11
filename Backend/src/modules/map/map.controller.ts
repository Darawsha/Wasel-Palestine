import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CheckpointsService } from '../checkpoints/checkpoints.service';
import { IncidentsService } from '../incidents/incidents.service';
import { ReportsService } from '../reports/services/reports.service';
import { MapFilterQueryDto } from './dto/map-filter-query.dto';

@UseGuards(JwtAuthGuard)
@Controller({ path: 'map', version: '1' })
export class MapController {
  constructor(
    private readonly incidentsService: IncidentsService,
    private readonly checkpointsService: CheckpointsService,
    private readonly reportsService: ReportsService,
  ) {}

  @Get('incidents')
  async getFilteredIncidents(@Query() filterDto: MapFilterQueryDto) {
    const data = await this.incidentsService.getFilteredIncidents(filterDto);
    return { data };
  }

  @Get('checkpoints')
  async getFilteredCheckpoints(@Query() filterDto: MapFilterQueryDto) {
    const data = await this.checkpointsService.getFilteredCheckpoints(filterDto);
    return { data };
  }

  @Get('reports')
  async getFilteredReports(@Query() filterDto: MapFilterQueryDto) {
    const data = await this.reportsService.getMapReports(filterDto);
    return { data };
  }
}
