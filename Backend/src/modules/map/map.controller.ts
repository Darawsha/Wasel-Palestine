import { Controller, Get, Query } from '@nestjs/common';

import { CheckpointsService } from '../checkpoints/checkpoints.service';
import { IncidentsService } from '../incidents/incidents.service';
import { ReportsService } from '../reports/services/reports.service';
import { MapFilterQueryDto } from './dto/map-filter-query.dto';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  MapCheckpointsResponseDto,
  MapIncidentsResponseDto,
  MapReportsResponseDto,
} from './dto/map-response.dto';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../common/dto/error-response.dto';

@ApiTags('Map')
@Controller({ path: 'map', version: '1' })
export class MapController {
  constructor(
    private readonly incidentsService: IncidentsService,
    private readonly checkpointsService: CheckpointsService,
    private readonly reportsService: ReportsService,
  ) {}

  @Get('incidents')
  @ApiOperation({
    summary: 'Get incident markers filtered for map display',
    description:
      'Returns incidents formatted for map rendering and filtered by type, severity, and optional date range.',
  })
  @ApiQuery({
    name: 'types',
    required: false,
    enum: ['CLOSURE', 'DELAY', 'ACCIDENT', 'WEATHER_HAZARD'],
    isArray: true,
    example: ['CLOSURE'],
    description: 'Incident types filter',
  })
  @ApiQuery({
    name: 'severity',
    required: false,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    example: 'MEDIUM',
    description: 'Incident severity filter',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    format: 'date-time',
    example: '2026-04-10T00:00:00.000Z',
    description: 'Start date-time filter',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    format: 'date-time',
    example: '2026-04-13T23:59:59.999Z',
    description: 'End date-time filter',
  })
  @ApiOkResponse({
    description: 'Filtered incidents returned',
    type: MapIncidentsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid map filter query',
    type: ValidationErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  async getFilteredIncidents(@Query() filterDto: MapFilterQueryDto) {
    const data = await this.incidentsService.getFilteredIncidents(filterDto);
    return { data };
  }

  @Get('checkpoints')
  @ApiOperation({
    summary: 'Get checkpoint markers filtered for map display',
    description:
      'Returns checkpoints for map rendering and supports optional date range filtering from status history.',
  })
  @ApiQuery({
    name: 'types',
    required: false,
    enum: ['CLOSURE', 'DELAY', 'ACCIDENT', 'WEATHER_HAZARD'],
    isArray: true,
    example: ['CLOSURE'],
    description: 'Incident types filter',
  })
  @ApiQuery({
    name: 'severity',
    required: false,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    example: 'MEDIUM',
    description: 'Incident severity filter',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    format: 'date-time',
    example: '2026-04-10T00:00:00.000Z',
    description: 'Start date-time filter',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    format: 'date-time',
    example: '2026-04-13T23:59:59.999Z',
    description: 'End date-time filter',
  })
  @ApiOkResponse({
    description: 'Filtered checkpoints returned',
    type: MapCheckpointsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid map filter query',
    type: ValidationErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  async getFilteredCheckpoints(@Query() filterDto: MapFilterQueryDto) {
    const data = await this.checkpointsService.getFilteredCheckpoints(filterDto);
    return { data };
  }

  @Get('reports')
  @ApiOperation({
    summary: 'Get report markers filtered for map display',
    description:
      'Returns community reports for map rendering with support for category and date-range filters.',
  })
  @ApiQuery({
    name: 'types',
    required: false,
    enum: ['CLOSURE', 'DELAY', 'ACCIDENT', 'WEATHER_HAZARD'],
    isArray: true,
    example: ['CLOSURE'],
    description: 'Incident types filter',
  })
  @ApiQuery({
    name: 'severity',
    required: false,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    example: 'MEDIUM',
    description: 'Incident severity filter',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    format: 'date-time',
    example: '2026-04-10T00:00:00.000Z',
    description: 'Start date-time filter',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    format: 'date-time',
    example: '2026-04-13T23:59:59.999Z',
    description: 'End date-time filter',
  })
  @ApiOkResponse({
    description: 'Filtered reports returned',
    type: MapReportsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid map filter query',
    type: ValidationErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  async getFilteredReports(@Query() filterDto: MapFilterQueryDto) {
    const reports = await this.reportsService.getMapReports(filterDto);
    const data = reports.map((report) => ({
      reportId: report.reportId,
      latitude: Number(report.latitude),
      longitude: Number(report.longitude),
      location: report.location,
      category: report.category,
      description: report.description,
      status: report.status,
      duplicateOf: report.duplicateOf ?? null,
      confidenceScore: report.confidenceScore,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    }));
    return { data };
  }
}
