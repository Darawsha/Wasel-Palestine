import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertPreference } from './entities/alert-preference.entity';
import { AlertRecord } from './entities/alert-record.entity';
import { AlertMessage } from './entities/alert-message.entity';
import { AlertPreferencesService } from './services/alert-preferences.service';
import { AlertRecordsService } from './services/alert-records.service';
import { AlertsValidationService } from './services/alerts-validation.service';
import { AlertNotificationService } from './services/alert-notification.service';
import { IncidentAlertListener } from './listeners/incident-created.observer';
import { DatabaseNotificationProvider } from './providers/database-notification.provider';

@Module({
  imports: [TypeOrmModule.forFeature([AlertPreference, AlertRecord, AlertMessage])],
  controllers: [AlertsController],
  providers: [
    AlertsService,
    AlertPreferencesService,
    AlertRecordsService,
    AlertsValidationService,
    AlertNotificationService,
    IncidentAlertListener,
    DatabaseNotificationProvider,
  ],
  exports: [AlertsService],
})
export class AlertsModule {}
