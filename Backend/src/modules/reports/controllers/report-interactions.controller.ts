import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ConfirmReportDto } from '../dto/confirm-report.dto';
import { VoteReportDto } from '../dto/vote.dto';
import { ReportCredibilityService } from '../services/report-credibility.service';

@Controller({ path: 'reports', version: '1' })
export class ReportInteractionsController {
  constructor(private readonly credibilityService: ReportCredibilityService) {}

  @Post(':id/vote')
  async voteReport(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VoteReportDto,
    @Req() req: any,
  ) {
    const userId =
      req.user?.id ?? req.user?.userId ?? req.user?.sub ?? dto['userId'];

    return this.credibilityService.vote(id, userId, dto.type);
  }

  @Post(':id/confirm')
  async confirmReport(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmReportDto,
    @Req() req: any,
  ) {
    const userId =
      req.user?.id ?? req.user?.userId ?? req.user?.sub ?? dto.userId;

    return this.credibilityService.confirm(id, userId);
  }
}
