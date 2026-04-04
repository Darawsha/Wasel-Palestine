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
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { CreateReportDto } from '../dto/create-report.dto';
import { ReportQueryDto } from '../dto/report-query.dto';
import { UpdateReportDto } from '../dto/update-report.dto';
import { ReportsService } from '../services/reports.service';

@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateReportDto, @Req() req: any) {
    const userId = Number(req.user?.id ?? req.user?.userId ?? req.user?.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException(
        'Authenticated user id is missing from token',
      );
    }

    return this.reportsService.create(dto, userId);
  }

  @Get()
  findAll(@Query() query: ReportQueryDto) {
    return this.reportsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReportDto) {
    return this.reportsService.update(id, dto);
  }
}
