// Persists notifications in alert_messages so they can be shown in user inboxes.
import { Injectable } from '@nestjs/common';
import { NotificationProvider } from './notification-provider.interface';
import { AlertMessage } from '../entities/alert-message.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class DatabaseNotificationProvider implements NotificationProvider {
  constructor(
    @InjectRepository(AlertMessage)
    private readonly alertMessageRepository: Repository<AlertMessage>,
  ) {}
  async sendNotification(
    recipient: string,
    message: string,
    options?: Record<string, any>,
  ): Promise<void> {
    const incidentId = String(options?.incidentId ?? 'system');
    const normalizedRecipient = String(recipient || '').trim();
    const normalizedMessage = String(message || '').trim();

    const alertMessage = this.alertMessageRepository.create({
      incidentId,
      messageBody: normalizedRecipient
        ? `[${normalizedRecipient}] ${normalizedMessage}`
        : normalizedMessage,
    });

    await this.alertMessageRepository.save(alertMessage);
  }
}