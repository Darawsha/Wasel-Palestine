import { 
  BadRequestException,
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Delete, 
  Patch, 
  UseGuards, 
  Request, 
  ParseUUIDPipe 
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateAlertPreferenceDto } from './dto/create-alert-preference.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AlertPreferenceResponseDto,
  AlertRecordResponseDto,
} from './dto/alert-response.dto';
import {
  MessageResponseDto,
} from '../../common/dto/common-response.dto';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../common/dto/error-response.dto';

import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

@ApiTags('Alerts')
@ApiBearerAuth('token')
@UseGuards(JwtAuthGuard) 
@Controller({ path: 'alerts', version: '1' })
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  private extractAuthenticatedUserId(req: {
    user?: { userId?: unknown; id?: unknown; sub?: unknown };
  }): number {
    const rawUserId = req?.user?.userId ?? req?.user?.id ?? req?.user?.sub;
    const userId = Number(rawUserId);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException('Invalid authenticated user id.');
    }

    return userId;
  }

  @Post('preferences')
  @ApiOperation({
    summary: 'Subscribe the authenticated user to area alerts',
    description:
      'Creates an active alert preference for the authenticated user using geographic area and incident category.',
  })
  @ApiBody({ type: CreateAlertPreferenceDto })
  @ApiCreatedResponse({
    description: 'Alert preference created',
    type: AlertPreferenceResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request payload or invalid authenticated user id',
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
  subscribe(
    @Request() req, 
    @Body() createAlertPreferenceDto: CreateAlertPreferenceDto,
  ) {
    const userId = this.extractAuthenticatedUserId(req);
    return this.alertsService.subscribeToArea(userId, createAlertPreferenceDto);
  }

  @Get('preferences')
  @ApiOperation({
    summary: 'Get alert preferences for the authenticated user',
    description:
      'Returns all active alert preferences owned by the authenticated user.',
  })
  @ApiOkResponse({
    description: 'User alert preferences returned',
    type: AlertPreferenceResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'Invalid authenticated user id',
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
  getUserPreferences(@Request() req) {
    const userId = this.extractAuthenticatedUserId(req);
    return this.alertsService.getUserPreferences(userId);
  }

  @Delete('preferences/:id')
  @ApiOperation({
    summary: 'Unsubscribe from an alert preference',
    description:
      'Removes an alert subscription for the authenticated user based on category and channel preferences.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'Alert preference identifier',
    example: '01eb3d48-d875-4dad-881b-239428cfb77d',
  })
  @ApiOkResponse({
    description: 'Alert preference removed',
    type: MessageResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid UUID or invalid authenticated user id',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Subscription not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  unsubscribe(
    @Request() req,
    @Param('id', ParseUUIDPipe) preferenceId: string,
  ) {
    const userId = this.extractAuthenticatedUserId(req);
    return this.alertsService.unsubscribe(userId, preferenceId);
  }

  @Get('inbox')
  @ApiOperation({
    summary: 'Get inbox notifications for the authenticated user',
    description:
      'Returns notification delivery records for the authenticated user, including attached alert message details.',
  })
  @ApiOkResponse({
    description: 'Alert inbox returned',
    type: AlertRecordResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'Invalid authenticated user id',
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
  getUserInbox(@Request() req) {
    const userId = this.extractAuthenticatedUserId(req);
    return this.alertsService.getUserInbox(userId);
  }

  @Patch('inbox/:id/read')
  @ApiOperation({
    summary: 'Mark an inbox alert as read',
    description:
      'Marks a specific inbox alert entry as read for the authenticated user so it no longer appears as unread.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'Inbox record identifier',
    example: '0f14b8ca-c02e-444d-ae60-af83341a6b7c',
  })
  @ApiOkResponse({
    description: 'Inbox record marked as read',
    type: AlertRecordResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid UUID or invalid authenticated user id',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Alert record not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  markAsRead(
    @Request() req,
    @Param('id', ParseUUIDPipe) recordId: string,
  ) {
    const userId = this.extractAuthenticatedUserId(req);
    return this.alertsService.markAsRead(userId, recordId);
  }
}