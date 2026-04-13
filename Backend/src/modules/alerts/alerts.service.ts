import { Injectable } from '@nestjs/common';
import { CreateAlertPreferenceDto } from './dto/create-alert-preference.dto';
import { CreateAlertPreferencesBatchDto } from './dto/create-alert-preferences-batch.dto';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { AlertPreferencesService } from './services/alert-preferences.service';
import { AlertMatchesService } from './services/alert-matches.service';
import { AlertRecordsService } from './services/alert-records.service';

@Injectable()
export class AlertsService {
  constructor(
    private readonly alertPreferencesService: AlertPreferencesService,
    private readonly alertMatchesService: AlertMatchesService,
    private readonly alertRecordsService: AlertRecordsService,
  ) {}

  async create(createAlertDto: CreateAlertDto) {
    return this.alertRecordsService.create(createAlertDto);
  }

  async findAll() {
    return this.alertRecordsService.findAll();
  }

  async findOne(id: string) {
    return this.alertRecordsService.findOne(id);
  }

  async update(id: string, updateAlertDto: UpdateAlertDto) {
    return this.alertRecordsService.update(id, updateAlertDto);
  }

  async remove(id: string) {
    return this.alertRecordsService.remove(id);
  }

  async subscribeToArea(userId: number, dto: CreateAlertPreferenceDto) {
    return this.alertPreferencesService.subscribeToArea(userId, dto);
  }

  async subscribeToAreas(userId: number, dto: CreateAlertPreferencesBatchDto) {
    return this.alertPreferencesService.subscribeToAreas(userId, dto);
  }

  async getUserPreferences(userId: number) {
    return this.alertPreferencesService.getUserPreferences(userId);
  }

  async getUserAlertOverview(userId: number) {
    return this.alertMatchesService.getUserAlertOverview(userId);
  }

  async unsubscribe(userId: number, preferenceId: string) {
    return this.alertPreferencesService.unsubscribe(userId, preferenceId);
  }

  async getUserInbox(userId: number) {
    return this.alertRecordsService.getUserInbox(userId);
  }

  async markAsRead(userId: number, recordId: string) {
    return this.alertRecordsService.markAsRead(userId, recordId);
  }
}
