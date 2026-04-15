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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ReportModerationResultResponseDto } from '../dto/report-response.dto';
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

@ApiTags('Report Moderation')
@ApiBearerAuth('token')
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
  @ApiOperation({
    summary: 'Mark a report as under review',
    description:
      'Moves a pending report into the under-review state and records moderation audit details.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Report identifier',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Report moved to under review',
    type: ReportModerationResultResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid transition or moderation payload',
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
    description: 'Report or moderator user not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
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
  @ApiOperation({
    summary: 'Approve a report',
    description:
      'Approves a report that is currently under review and stores moderation audit context.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Report identifier',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Report approved successfully',
    type: ReportModerationResultResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid transition or moderation payload',
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
    description: 'Report or moderator user not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
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
  @ApiOperation({
    summary: 'Reject a report',
    description:
      'Rejects a report that is currently under review and stores moderation audit context.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Report identifier',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Report rejected successfully',
    type: ReportModerationResultResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid transition or moderation payload',
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
    description: 'Report or moderator user not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
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
  @ApiOperation({
    summary: 'Resolve a moderated report',
    description:
      'Marks a report as resolved after moderation or follow-up is complete and stores audit details.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Report identifier',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Report resolved successfully',
    type: ReportModerationResultResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid transition or moderation payload',
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
    description: 'Report or moderator user not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  resolve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModerateReportDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.moderationService.resolve(id, userId, dto.notes);
  }
}
