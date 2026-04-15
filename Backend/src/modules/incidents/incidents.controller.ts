import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
  Query,
  Delete,
} from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { IncidentQueryDto } from './dto/incident-query.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import {
  ApiExcludeEndpoint,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  IncidentHistoryEnvelopeResponseDto,
  IncidentPaginatedResponseDto,
  IncidentResponseDto,
  IncidentTimelineResponseDto,
  IncidentVerifyLegacyResponseDto,
} from './dto/incident-response.dto';
import {
  CountResponseDto,
} from '../../common/dto/common-response.dto';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../common/dto/error-response.dto';

@ApiTags('Incidents')
@Controller({ path: 'incidents', version: '1' })
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  @ApiBearerAuth('token')
  @ApiOperation({
    summary: 'Create an incident (collection-style endpoint)',
    description:
      'Creates a new incident entry. This collection-style endpoint is restricted to administrators.',
  })
  @ApiCreatedResponse({
    description: 'Incident created successfully',
    type: IncidentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid incident payload',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  createFromCollection(
    @Body() createIncidentDto: CreateIncidentDto,
    @Request() req,
  ) {
    return this.incidentsService.create(createIncidentDto, req.user.userId);
  }

  @Patch(':id/verify-legacy')
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'Mark an incident as verified (legacy endpoint)',
    description:
      'Verifies an incident using the legacy flow and returns either the updated incident or a message if it was already verified.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Incident identifier',
    example: 3,
  })
  @ApiOkResponse({
    description: 'Incident verified successfully or already verified message returned',
    type: IncidentVerifyLegacyResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid incident id',
    type: ValidationErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Incident not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  verifyIncident(@Param('id', ParseIntPipe) id: number) {
    return this.incidentsService.verifyIncident(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('create')
  @ApiBearerAuth('token')
  @ApiOperation({
    summary: 'Create an incident',
    description:
      'Creates an incident from the provided payload and associates the change with the authenticated admin user.',
  })
  @ApiCreatedResponse({
    description: 'Incident created successfully',
    type: IncidentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid incident payload',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  create(@Body() createIncidentDto: CreateIncidentDto, @Request() req) {
    return this.incidentsService.create(createIncidentDto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth('token')
  @ApiOperation({
    summary: 'List incidents with pagination',
    description:
      'Returns a paginated incident dataset using optional filters like type, severity, status, and date range.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'CLOSED'], example: 'ACTIVE' })
  @ApiQuery({ name: 'type', required: false, enum: ['CLOSURE', 'DELAY', 'ACCIDENT', 'WEATHER_HAZARD'], example: 'DELAY' })
  @ApiQuery({ name: 'severity', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], example: 'HIGH' })
  @ApiQuery({ name: 'isVerified', required: false, type: Boolean, example: true })
  @ApiQuery({ name: 'checkpointId', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'closure' })
  @ApiQuery({ name: 'startDate', required: false, type: String, format: 'date-time', example: '2026-04-10T00:00:00.000Z' })
  @ApiQuery({ name: 'endDate', required: false, type: String, format: 'date-time', example: '2026-04-13T23:59:59.999Z' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['title', 'createdAt', 'updatedAt'], example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], example: 'DESC' })
  @ApiOkResponse({
    description: 'Paginated incidents returned',
    type: IncidentPaginatedResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  getAllIncidents(@Query() paginationQuery: PaginationQueryDto) {
    return this.incidentsService.findAllPaginated(paginationQuery);
  }

  @UseGuards(JwtAuthGuard)
  @Get('findAll')
  @ApiBearerAuth('token')
  @ApiOperation({
    summary: 'List incidents with filtering options',
    description:
      'Returns incidents filtered by status, type, severity, checkpoint, and sorting parameters.',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'CLOSED'], example: 'ACTIVE' })
  @ApiQuery({ name: 'type', required: false, enum: ['CLOSURE', 'DELAY', 'ACCIDENT', 'WEATHER_HAZARD'], example: 'DELAY' })
  @ApiQuery({ name: 'severity', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], example: 'HIGH' })
  @ApiQuery({ name: 'checkpointId', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['title', 'createdAt', 'updatedAt'], example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], example: 'DESC' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description: 'Filtered incidents returned',
    type: IncidentPaginatedResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  findAll(@Query() incidentQueryDto: IncidentQueryDto) {
    return this.incidentsService.findAll(incidentQueryDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('getAll')
  @ApiBearerAuth('token')
  @ApiOperation({
    summary: 'List incidents with data and pagination metadata',
    description:
      'Returns incident data with pagination metadata in a dedicated response shape used by dashboard views.',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'CLOSED'], example: 'ACTIVE' })
  @ApiQuery({ name: 'type', required: false, enum: ['CLOSURE', 'DELAY', 'ACCIDENT', 'WEATHER_HAZARD'], example: 'DELAY' })
  @ApiQuery({ name: 'severity', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], example: 'HIGH' })
  @ApiQuery({ name: 'checkpointId', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['title', 'createdAt', 'updatedAt'], example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], example: 'DESC' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description: 'Incidents and metadata returned',
    type: IncidentPaginatedResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  async findAllIncidents(@Query() incidentQueryDto: IncidentQueryDto) {
    const result =
      await this.incidentsService.findAllIncidents(incidentQueryDto);
    return {
      data: result.data,
      meta: result.meta,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('counts')
  @ApiBearerAuth('token')
  @ApiOperation({
    summary: 'Get total incident count',
    description: 'Returns the total number of incidents in the database.',
  })
  @ApiOkResponse({
    description: 'Incident count returned',
    type: CountResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  async countIncidents() {
    const count = await this.incidentsService.countIncidents();
    return { count };
  }

  @UseGuards(JwtAuthGuard)
  @Get('active-count')
  @ApiBearerAuth('token')
  @ApiOperation({
    summary: 'Get active incident count',
    description: 'Returns the number of incidents currently in ACTIVE status.',
  })
  @ApiOkResponse({
    description: 'Active incident count returned',
    type: CountResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  async getActiveIncidentsCount() {
    const count = await this.incidentsService.getActiveIncidentsCount();
    return { count };
  }

  @UseGuards(JwtAuthGuard)
  @Get('today-count')
  @ApiBearerAuth('token')
  @ApiOperation({
    summary: 'Get incidents created today count',
    description:
      'Returns the number of incidents created since the start of the current day.',
  })
  @ApiOkResponse({
    description: 'Today incident count returned',
    type: CountResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  async getIncidentsCreatedTodayCount() {
    const count = await this.incidentsService.getIncidentsCreatedTodayCount();
    return { count };
  }

  @UseGuards(JwtAuthGuard)
  @Get('timeline')
  @ApiBearerAuth('token')
  @ApiOperation({
    summary: 'Get incident timeline for the last N days',
    description:
      'Returns chart-ready incident timeline points grouped by day for the requested time window.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to include in the timeline',
    example: 7,
  })
  @ApiOkResponse({
    description: 'Incident timeline returned',
    type: IncidentTimelineResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid days value',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  getIncidentsTimeline(@Query('days') days?: string) {
    return this.incidentsService.getIncidentsTimeline(
      days ? Number(days) : undefined,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/history')
  @ApiBearerAuth('token')
  @ApiOperation({
    summary: 'Get history entries for an incident',
    description:
      'Returns status history records for the selected incident ordered from newest to oldest.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Incident identifier',
    example: 3,
  })
  @ApiOkResponse({
    description: 'Incident history returned',
    type: IncidentHistoryEnvelopeResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid incident id',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Incident not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  getHistory(@Param('id', ParseIntPipe) id: number) {
    return this.incidentsService.getHistory(id).then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth('token')
  @ApiOperation({
    summary: 'Get an incident by id',
    description: 'Returns full incident details for the provided incident identifier.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Incident identifier',
    example: 3,
  })
  @ApiOkResponse({
    description: 'Incident returned',
    type: IncidentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid incident id',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Incident not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.incidentsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiBearerAuth('token')
  @ApiOperation({
    summary: 'Update an incident',
    description:
      'Updates incident details, status lifecycle fields, and checkpoint linkage. Restricted to admins.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Incident identifier',
    example: 3,
  })
  @ApiOkResponse({
    description: 'Incident updated successfully',
    type: IncidentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid incident id or payload',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Incident not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateIncidentDto: UpdateIncidentDto,
    @Request() req,
  ) {
    return this.incidentsService.update(id, updateIncidentDto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/verify')
  @ApiBearerAuth('token')
  @ApiOperation({
    summary: 'Verify an incident as admin',
    description:
      'Marks an incident as verified in the admin workflow and records verification metadata.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Incident identifier',
    example: 3,
  })
  @ApiOkResponse({
    description: 'Incident verified successfully',
    type: IncidentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid incident id or invalid state transition',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Incident not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  verify(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.incidentsService.verify(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/close')
  @ApiBearerAuth('token')
  @ApiOperation({
    summary: 'Close an incident as admin',
    description:
      'Transitions an active incident to CLOSED and records closing metadata. Restricted to admins.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Incident identifier',
    example: 3,
  })
  @ApiOkResponse({
    description: 'Incident closed successfully',
    type: IncidentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid incident id or invalid state transition',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Incident not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  close(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.incidentsService.close(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiBearerAuth('token')
  @ApiOperation({
    summary: 'Delete an incident as admin',
    description:
      'Deletes an incident permanently from the system. Restricted to admins.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Incident identifier',
    example: 13,
  })
  @ApiNoContentResponse({
    description: 'Incident deleted successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid incident id',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Incident not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.incidentsService.remove(id, req.user.userId);
  }
}
