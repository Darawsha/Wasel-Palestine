import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { CreateReportDto } from '../dto/create-report.dto';
import { ReportQueryDto } from '../dto/report-query.dto';
import { UpdateReportDto } from '../dto/update-report.dto';
import { ReportsService } from '../services/reports.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ReportCategorySummaryResponseDto,
  ReportPaginatedResponseDto,
  ReportResponseDto,
} from '../dto/report-response.dto';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../../common/dto/error-response.dto';

type AuthenticatedRequest = Request & {
  user?: {
    id?: number | string;
    userId?: number | string;
    sub?: number | string;
  };
};

@ApiTags('Reports')
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private getAuthenticatedUserId(req: AuthenticatedRequest): number {
    const rawId = req?.user?.id ?? req?.user?.userId ?? req?.user?.sub;
    const userId = Number(rawId);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException(
        'Authenticated user id is missing from token',
      );
    }

    return userId;
  }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('token')
  @ApiOperation({
    summary: 'Create a new report',
    description:
      'Creates a new user-submitted report after validation, spam checks, and duplicate detection.',
  })
  @ApiCreatedResponse({
    description: 'Report created successfully',
    type: ReportResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid report payload or business validation failure',
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
  create(@Body() dto: CreateReportDto, @Req() req: AuthenticatedRequest) {
    const userId = this.getAuthenticatedUserId(req);
    return this.reportsService.create(dto, userId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('token')
  @ApiOperation({
    summary: 'Get reports created by the authenticated user',
    description:
      'Returns a paginated list of reports submitted by the current user with optional filtering and sorting.',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'under_review', 'approved', 'rejected', 'resolved'], example: 'pending' })
  @ApiQuery({ name: 'category', required: false, enum: ['checkpoint_issue', 'road_closure', 'delay', 'accident', 'hazard', 'other'], example: 'road_closure' })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'closure' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description: 'User reports returned',
    type: ReportPaginatedResponseDto,
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
  findMyReports(
    @Query() query: ReportQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.reportsService.findMyReports(query, userId);
  }

  @Get('community')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('token')
  @ApiOperation({
    summary: 'Get community reports visible to the user',
    description:
      'Returns a paginated community feed of reports visible to the current user with filtering and sorting options.',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'under_review', 'approved', 'rejected', 'resolved'], example: 'pending' })
  @ApiQuery({ name: 'category', required: false, enum: ['checkpoint_issue', 'road_closure', 'delay', 'accident', 'hazard', 'other'], example: 'road_closure' })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'checkpoint' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description: 'Community reports returned',
    type: ReportPaginatedResponseDto,
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
  findCommunityReports(
    @Query() query: ReportQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.reportsService.findCommunityReports(query, userId);
  }

  @Get('category-summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('token')
  @ApiOperation({
    summary: 'Get report counts grouped by category (admin only)',
    description:
      'Returns report category totals for the admin analytics dashboard.',
  })
  @ApiOkResponse({
    description: 'Report category summary returned',
    type: ReportCategorySummaryResponseDto,
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
  getCategorySummary() {
    return this.reportsService.getCategorySummary();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('token')
  @ApiOperation({
    summary: 'List all reports (admin only)',
    description:
      'Returns a paginated list of reports for moderation with support for advanced filters and sorting.',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'under_review', 'approved', 'rejected', 'resolved'], example: 'pending' })
  @ApiQuery({ name: 'category', required: false, enum: ['checkpoint_issue', 'road_closure', 'delay', 'accident', 'hazard', 'other'], example: 'road_closure' })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'review' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description: 'All reports returned',
    type: ReportPaginatedResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
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
  findAll(@Query() query: ReportQueryDto) {
    return this.reportsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a report by id',
    description:
      'Returns a single report by identifier including interaction summary details for display.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Report identifier',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Report returned',
    type: ReportResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid report id',
    type: ValidationErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Report not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.findOne(id);
  }

  @Patch('my/:id')
  @UseGuards(JwtAuthGuard)
  updateOwn(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReportDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.reportsService.updateOwnReport(id, dto, userId);
  }

  @Delete('my/:id')
  @UseGuards(JwtAuthGuard)
  removeOwn(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.reportsService.removeOwnReport(id, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('token')
  @ApiOperation({
    summary: 'Update a report (admin only)',
    description:
      'Updates mutable report fields and returns the refreshed report payload for admin workflows.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Report identifier',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Report updated successfully',
    type: ReportResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid report id or update payload',
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
    description: 'Report not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReportDto) {
    return this.reportsService.update(id, dto);
  }
}
