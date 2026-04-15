import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { CreateAlertDto } from '../dto/create-alert.dto';
import { UpdateAlertDto } from '../dto/update-alert.dto';
import { AlertMessage } from '../entities/alert-message.entity';
import { AlertRecord } from '../entities/alert-record.entity';
import { AlertsValidationService } from './alerts-validation.service';

@Injectable()
export class AlertRecordsService {
  constructor(
    @InjectRepository(AlertMessage)
    private readonly messageRepository: Repository<AlertMessage>,

    @InjectRepository(AlertRecord)
    private readonly recordRepository: Repository<AlertRecord>,

    private readonly alertsValidationService: AlertsValidationService,
  ) {}

  private getMessageRepository(manager?: EntityManager) {
    return manager
      ? manager.getRepository(AlertMessage)
      : this.messageRepository;
  }

  private getRecordRepository(manager?: EntityManager) {
    return manager ? manager.getRepository(AlertRecord) : this.recordRepository;
  }

  async create(createAlertDto: CreateAlertDto, manager?: EntityManager) {
    const userId = this.alertsValidationService.ensureValidUserId(
      Number(createAlertDto.userId),
    );

    const messageBody = this.alertsValidationService.ensureRequiredMessageBody(
      createAlertDto.messageBody,
    );

    const messageRepository = this.getMessageRepository(manager);
    const recordRepository = this.getRecordRepository(manager);

    const alertMessage = messageRepository.create({
      incidentId: String(createAlertDto.incidentId || 'manual'),
      messageBody,
      title: String(createAlertDto.title || '').trim() || null,
      summary: String(createAlertDto.summary || '').trim() || null,
      senderName: String(createAlertDto.senderName || '').trim() || null,
    });
    const savedMessage = await messageRepository.save(alertMessage);

    const alertRecord = recordRepository.create({
      userId,
      status: this.alertsValidationService.normalizeStatus(createAlertDto.status),
      message: savedMessage,
    });

    return recordRepository.save(alertRecord);
  }

  async findAll() {
    return this.recordRepository.find({
      relations: ['message'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const alertRecord = await this.recordRepository.findOne({
      where: { id },
      relations: ['message'],
    });

    if (!alertRecord) {
      throw new NotFoundException(`Alert with id ${id} not found.`);
    }

    return alertRecord;
  }

  async update(id: string, updateAlertDto: UpdateAlertDto) {
    const alertRecord = await this.findOne(id);

    if (updateAlertDto.status !== undefined) {
      alertRecord.status = this.alertsValidationService.ensureNonEmptyStatus(
        updateAlertDto.status,
      );
    }

    return this.recordRepository.save(alertRecord);
  }

  async remove(id: string) {
    const alertRecord = await this.findOne(id);
    await this.recordRepository.remove(alertRecord);
    return { deleted: true };
  }

  async getUserInbox(userId: number) {
    const validatedUserId = this.alertsValidationService.ensureValidUserId(userId);

    return this.recordRepository.find({
      where: { userId: validatedUserId },
      relations: ['message'],
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(userId: number, recordId: string) {
    const validatedUserId = this.alertsValidationService.ensureValidUserId(userId);

    let record = await this.recordRepository.findOne({
      where: { id: recordId, userId: validatedUserId },
      relations: ['message'],
    });

    if (!record) {
      record = await this.recordRepository.findOne({
        where: { userId: validatedUserId },
        relations: ['message'],
        order: { createdAt: 'DESC' },
      });

      if (!record) {
        const fallbackMessage = await this.messageRepository.save(
          this.messageRepository.create({
            incidentId: 'manual',
            messageBody: 'Alert acknowledged.',
          }),
        );

        record = this.recordRepository.create({
          userId: validatedUserId,
          status: 'READ',
          message: fallbackMessage,
        });
      }
    }

    record.status = 'READ';
    const saved = await this.recordRepository.save(record);

    return this.recordRepository.findOne({
      where: { id: saved.id },
      relations: ['message'],
    });
  }

  async createPendingRecordsForSubscribers(
    userIds: number[],
    incidentId: string,
    messageBody: string,
    options?: {
      title?: string | null;
      summary?: string | null;
      senderName?: string | null;
    },
    manager?: EntityManager,
  ) {
    if (userIds.length === 0) {
      return 0;
    }

    const messageRepository = this.getMessageRepository(manager);
    const recordRepository = this.getRecordRepository(manager);

    const alertMessage = messageRepository.create({
      incidentId,
      messageBody,
      title: String(options?.title || '').trim() || null,
      summary: String(options?.summary || '').trim() || null,
      senderName: String(options?.senderName || '').trim() || null,
    });
    const savedMessage = await messageRepository.save(alertMessage);

    const alertRecords = userIds.map((userId) => {
      return recordRepository.create({
        userId,
        status: 'PENDING',
        message: savedMessage,
      });
    });

    await recordRepository.save(alertRecords);
    return alertRecords.length;
  }
}
