import {
  Body,
  Controller,
  Get,
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

@Controller({ path: 'incidents', version: '1' })
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  createFromCollection(
    @Body() createIncidentDto: CreateIncidentDto,
    @Request() req,
  ) {
    return this.incidentsService.create(createIncidentDto, req.user.userId);
  }

  @Patch(':id/verify')
  verifyIncident(@Param('id', ParseIntPipe) id: number) {
    return this.incidentsService.verifyIncident(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('create')
  create(@Body() createIncidentDto: CreateIncidentDto, @Request() req) {
    return this.incidentsService.create(createIncidentDto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getAllIncidents(@Query() paginationQuery: PaginationQueryDto) {
    return this.incidentsService.findAllPaginated(paginationQuery);
  }

  @UseGuards(JwtAuthGuard)
  @Get('findAll')
  findAll(@Query() incidentQueryDto: IncidentQueryDto) {
    return this.incidentsService.findAll(incidentQueryDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('getAll')
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
  async countIncidents() {
    const count = await this.incidentsService.countIncidents();
    return { count };
  }

  @UseGuards(JwtAuthGuard)
  @Get('active-count')
  async getActiveIncidentsCount() {
    const count = await this.incidentsService.getActiveIncidentsCount();
    return { count };
  }

  @UseGuards(JwtAuthGuard)
  @Get('today-count')
  async getIncidentsCreatedTodayCount() {
    const count = await this.incidentsService.getIncidentsCreatedTodayCount();
    return { count };
  }

  @UseGuards(JwtAuthGuard)
  @Get('timeline')
  getIncidentsTimeline(@Query('days') days?: string) {
    return this.incidentsService.getIncidentsTimeline(
      days ? Number(days) : undefined,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/history')
  getHistory(@Param('id', ParseIntPipe) id: number) {
    return this.incidentsService.getHistory(id).then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.incidentsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
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
  verify(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.incidentsService.verify(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/close')
  close(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.incidentsService.close(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.incidentsService.remove(id, req.user.userId);
  }
}
