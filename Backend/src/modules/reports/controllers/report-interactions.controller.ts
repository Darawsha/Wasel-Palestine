import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { ConfirmReportDto } from '../dto/confirm-report.dto';
import { VoteReportDto } from '../dto/vote.dto';
import { ReportCredibilityService } from '../services/report-credibility.service';

@Controller({ path: 'reports', version: '1' })
export class ReportInteractionsController {
  constructor(private readonly credibilityService: ReportCredibilityService) {}

  private getAuthenticatedUserId(req: any): number {
    const rawId = req?.user?.id ?? req?.user?.userId ?? req?.user?.sub;
    const userId = Number(rawId);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException(
        'Authenticated user id is missing from token',
      );
    }

    return userId;
  }

  @Post(':id/vote')
  @UseGuards(JwtAuthGuard)
  async voteReport(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VoteReportDto,
    @Req() req: any,
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.credibilityService.vote(id, userId, dto.type);
  }

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard)
  async confirmReport(
    @Param('id', ParseIntPipe) id: number,
    @Body() _dto: ConfirmReportDto,
    @Req() req: any,
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.credibilityService.confirm(id, userId);
  }
}
