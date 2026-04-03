import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class AlertsValidationService {
  ensureValidUserId(userId: number): number {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException(
        'userId is required and must be a positive integer.',
      );
    }

    return userId;
  }

  ensureRequiredMessageBody(messageBody: unknown): string {
    const normalizedMessageBody = String(messageBody || '').trim();
    if (!normalizedMessageBody) {
      throw new BadRequestException('messageBody is required.');
    }

    return normalizedMessageBody;
  }

  normalizeStatus(status: unknown, fallback = 'PENDING'): string {
    return String(status || fallback).toUpperCase();
  }

  ensureNonEmptyStatus(status: unknown): string {
    const normalizedStatus = String(status).trim().toUpperCase();
    if (!normalizedStatus) {
      throw new BadRequestException('status cannot be empty.');
    }

    return normalizedStatus;
  }
}