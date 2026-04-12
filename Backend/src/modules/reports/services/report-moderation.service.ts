import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
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
    private readonly dataSource: DataSource,
  ) {}

  private async findOne(id: number) {
    const report = await this.reportRepo.findOne({ where: { reportId: id } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    return report;
  }

  private async logAction(
    auditRepo: Repository<ReportModerationAudit>,
    reportId: number,
    action: ReportModerationAction,
    performedByUserId: number,
    notes?: string,
  ) {
    try {
      await auditRepo.save({
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

  private ensureAllowedSourceStatuses(
    report: Report,
    allowedStatuses: ReportStatus[],
    invalidTransitionMessage: string,
  ) {
    if (!Array.isArray(allowedStatuses) || allowedStatuses.length === 0) {
      return;
    }

    if (!allowedStatuses.includes(report.status)) {
      throw new BadRequestException(invalidTransitionMessage);
    }
  }

  private async transitionReportStatus(
    id: number,
    performedByUserId: number,
    targetStatus: ReportStatus,
    action: ReportModerationAction,
    alreadyMessage: string,
    allowedSourceStatuses: ReportStatus[] = [],
    invalidTransitionMessage = 'Report is not in a valid status for this action',
    notes?: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const reportRepo = manager.getRepository(Report);
      const auditRepo = manager.getRepository(ReportModerationAudit);
      const userRepo = manager.getRepository(User);

      const report = await reportRepo.findOne({ where: { reportId: id } });
      if (!report) {
        throw new NotFoundException('Report not found');
      }

      const moderator = await userRepo.findOne({
        where: { id: performedByUserId },
      });
      if (!moderator) {
        throw new NotFoundException('Moderator user not found');
      }

      this.ensureNotAlreadyInStatus(report, targetStatus, alreadyMessage);
      this.ensureAllowedSourceStatuses(
        report,
        allowedSourceStatuses,
        invalidTransitionMessage,
      );

      report.status = targetStatus;
      const saved = await reportRepo.save(report);

      await this.logAction(auditRepo, id, action, performedByUserId, notes);
      return saved;
    });
  }

  async markUnderReview(id: number, performedByUserId: number, notes?: string) {
    return this.transitionReportStatus(
      id,
      performedByUserId,
      ReportStatus.UNDER_REVIEW,
      ReportModerationAction.UNDER_REVIEW,
      'Report is already under review',
      [ReportStatus.PENDING],
      'Only pending reports can be moved to under review',
      notes,
    );
  }

  async approve(id: number, performedByUserId: number, notes?: string) {
    return this.transitionReportStatus(
      id,
      performedByUserId,
      ReportStatus.APPROVED,
      ReportModerationAction.APPROVED,
      'Report is already approved',
      [ReportStatus.UNDER_REVIEW],
      'Only reports under review can be approved',
      notes,
    );
  }

  async reject(id: number, performedByUserId: number, notes?: string) {
    return this.transitionReportStatus(
      id,
      performedByUserId,
      ReportStatus.REJECTED,
      ReportModerationAction.REJECTED,
      'Report is already rejected',
      [ReportStatus.UNDER_REVIEW],
      'Only reports under review can be rejected',
      notes,
    );
  }

  async resolve(id: number, performedByUserId: number, notes?: string) {
    return this.transitionReportStatus(
      id,
      performedByUserId,
      ReportStatus.RESOLVED,
      ReportModerationAction.RESOLVED,
      'Report is already resolved',
      [],
      'Report is not in a valid status for this action',
      notes,
    );
  }
}
