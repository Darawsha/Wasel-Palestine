import {
  Body,
  Controller,
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

type AuthenticatedRequest = Request & {
  user?: {
    id?: number | string;
    userId?: number | string;
    sub?: number | string;
  };
};

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
  create(@Body() dto: CreateReportDto, @Req() req: AuthenticatedRequest) {
    const userId = this.getAuthenticatedUserId(req);
    return this.reportsService.create(dto, userId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  findMyReports(
    @Query() query: ReportQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.reportsService.findMyReports(query, userId);
  }

  @Get('community')
  @UseGuards(JwtAuthGuard)
  findCommunityReports(
    @Query() query: ReportQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.reportsService.findCommunityReports(query, userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(@Query() query: ReportQueryDto) {
    return this.reportsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReportDto) {
    return this.reportsService.update(id, dto);
  }
}
