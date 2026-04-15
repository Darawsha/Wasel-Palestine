import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
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
import { ReportInteractionResultResponseDto } from '../dto/report-response.dto';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../../common/dto/error-response.dto';

@ApiTags('Report Interactions')
@ApiBearerAuth('token')
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
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Submit a vote on a report credibility signal',
    description:
      'Records an up-vote or down-vote from the authenticated user and returns updated confidence and interaction summary values.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Report identifier',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Vote recorded successfully',
    type: ReportInteractionResultResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid vote request or duplicate vote state',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'User cannot vote on own report',
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
  async voteReport(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VoteReportDto,
    @Req() req: any,
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.credibilityService.vote(id, userId, dto.type);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Confirm that a report is accurate',
    description:
      'Records a confirmation from the authenticated user and returns updated confidence and interaction summary values.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Report identifier',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Confirmation recorded successfully',
    type: ReportInteractionResultResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid confirmation request or already confirmed',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'User cannot confirm own report',
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
  async confirmReport(
    @Param('id', ParseIntPipe) id: number,
    @Body() _dto: ConfirmReportDto,
    @Req() req: any,
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.credibilityService.confirm(id, userId);
  }
}
