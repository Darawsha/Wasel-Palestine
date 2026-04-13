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
import { CreateAlertPreferencesBatchDto } from './dto/create-alert-preferences-batch.dto';

import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

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
  subscribe(
    @Request() req, 
    @Body() createAlertPreferenceDto: CreateAlertPreferenceDto,
  ) {
    const userId = this.extractAuthenticatedUserId(req);
    return this.alertsService.subscribeToArea(userId, createAlertPreferenceDto);
  }

  @Post('preferences/batch')
  subscribeBatch(
    @Request() req,
    @Body() createAlertPreferencesBatchDto: CreateAlertPreferencesBatchDto,
  ) {
    const userId = this.extractAuthenticatedUserId(req);
    return this.alertsService.subscribeToAreas(userId, createAlertPreferencesBatchDto);
  }

  @Get('preferences')
  getUserPreferences(@Request() req) {
    const userId = this.extractAuthenticatedUserId(req);
    return this.alertsService.getUserPreferences(userId);
  }

  @Get('preferences/overview')
  getUserAlertOverview(@Request() req) {
    const userId = this.extractAuthenticatedUserId(req);
    return this.alertsService.getUserAlertOverview(userId);
  }

  @Delete('preferences/:id')
  unsubscribe(
    @Request() req,
    @Param('id', ParseUUIDPipe) preferenceId: string,
  ) {
    const userId = this.extractAuthenticatedUserId(req);
    return this.alertsService.unsubscribe(userId, preferenceId);
  }

  @Get('inbox')
  getUserInbox(@Request() req) {
    const userId = this.extractAuthenticatedUserId(req);
    return this.alertsService.getUserInbox(userId);
  }

  @Patch('inbox/:id/read')
  markAsRead(
    @Request() req,
    @Param('id', ParseUUIDPipe) recordId: string,
  ) {
    const userId = this.extractAuthenticatedUserId(req);
    return this.alertsService.markAsRead(userId, recordId);
  }
}
