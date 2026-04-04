import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ReportModerationAudit } from '../entities/report-moderation-audit.entity';
import { Report } from '../entities/report.entity';
import { ReportModerationAction } from '../enums/report-moderation-action.enum';
import { ReportStatus } from '../enums/report-status.enum';

@Injectable()
export class ReportModerationService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
    @InjectRepository(ReportModerationAudit)
    private readonly auditRepo: Repository<ReportModerationAudit>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private async findOne(id: number) {
    const report = await this.reportRepo.findOne({ where: { reportId: id } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    return report;
  }

  private async logAction(
    reportId: number,
    action: ReportModerationAction,
    performedByUserId: number,
    notes?: string,
  ) {
    const moderator = await this.userRepo.findOne({
      where: { id: performedByUserId },
    });

    if (!moderator) {
      throw new NotFoundException('Moderator user not found');
    }

    try {
      // Append-only audit: every moderation action is stored as a new row.
      await this.auditRepo.save({
        reportId,
        action,
        performedByUserId,
        notes,
      });
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const dbError = error as QueryFailedError & {
          code?: string;
          errno?: number;
        };

        if (
          dbError.code === 'ER_NO_REFERENCED_ROW_2' ||
          dbError.errno === 1452
        ) {
          throw new BadRequestException(
            'Cannot log moderation action due to invalid report or user reference',
          );
        }
      }
      throw error;
    }
  }

  private ensureNotAlreadyInStatus(
    report: Report,
    targetStatus: ReportStatus,
    alreadyMessage: string,
  ) {
    if (report.status === targetStatus) {
      throw new BadRequestException(alreadyMessage);
    }
  }

  async markUnderReview(id: number, performedByUserId: number, notes?: string) {
    const report = await this.findOne(id);
    this.ensureNotAlreadyInStatus(
      report,
      ReportStatus.UNDER_REVIEW,
      'Report is already under review',
    );

    report.status = ReportStatus.UNDER_REVIEW;
    const saved = await this.reportRepo.save(report);
    await this.logAction(
      id,
      ReportModerationAction.UNDER_REVIEW,
      performedByUserId,
      notes,
    );
    return saved;
  }

  async approve(id: number, performedByUserId: number, notes?: string) {
    const report = await this.findOne(id);
    this.ensureNotAlreadyInStatus(
      report,
      ReportStatus.APPROVED,
      'Report is already approved',
    );

    report.status = ReportStatus.APPROVED;
    const saved = await this.reportRepo.save(report);
    await this.logAction(
      id,
      ReportModerationAction.APPROVED,
      performedByUserId,
      notes,
    );
    return saved;
  }

  async reject(id: number, performedByUserId: number, notes?: string) {
    const report = await this.findOne(id);
    this.ensureNotAlreadyInStatus(
      report,
      ReportStatus.REJECTED,
      'Report is already rejected',
    );

    report.status = ReportStatus.REJECTED;
    const saved = await this.reportRepo.save(report);
    await this.logAction(
      id,
      ReportModerationAction.REJECTED,
      performedByUserId,
      notes,
    );
    return saved;
  }

  async resolve(id: number, performedByUserId: number, notes?: string) {
    const report = await this.findOne(id);
    this.ensureNotAlreadyInStatus(
      report,
      ReportStatus.RESOLVED,
      'Report is already resolved',
    );

    report.status = ReportStatus.RESOLVED;
    const saved = await this.reportRepo.save(report);
    await this.logAction(
      id,
      ReportModerationAction.RESOLVED,
      performedByUserId,
      notes,
    );
    return saved;
  }
}
