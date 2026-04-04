import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { ReportModerationService } from '../services/report-moderation.service';
import { ModerateReportDto } from '../dto/moderate-report.dto';

type AuthenticatedRequest = Request & {
  user?: {
    id?: number | string;
    userId?: number | string;
    sub?: number | string;
  };
};

@Controller({ path: 'reports', version: '1' })
export class ReportModerationController {
  constructor(private readonly moderationService: ReportModerationService) {}

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

  @Patch(':id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  markUnderReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModerateReportDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.moderationService.markUnderReview(id, userId, dto.notes);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModerateReportDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.moderationService.approve(id, userId, dto.notes);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModerateReportDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.moderationService.reject(id, userId, dto.notes);
  }

  @Patch(':id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  resolve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModerateReportDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.moderationService.resolve(id, userId, dto.notes);
  }
}
