import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { AuditAction } from '../../audit-log/enums/audit-action.enum';
import { AuditTargetType } from '../../audit-log/enums/audit-target-type.enum';
import { User } from '../../users/entities/user.entity';
import { ReportModerationAudit } from '../entities/report-moderation-audit.entity';
import { Report } from '../entities/report.entity';
import { ReportModerationAction } from '../enums/report-moderation-action.enum';
import { ReportStatus } from '../enums/report-status.enum';
import { ReportsService } from './reports.service';

type ReportTransitionResult = {
  report: Report;
  moderator: User;
  previousStatus: ReportStatus;
  targetStatus: ReportStatus;
  action: ReportModerationAction;
  notes?: string;
  changed: boolean;
};

@Injectable()
export class ReportModerationService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
    @InjectRepository(ReportModerationAudit)
    private readonly auditRepo: Repository<ReportModerationAudit>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
    private readonly reportsService: ReportsService,
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
    _alreadyMessage: string,
  ): boolean {
    return report.status === targetStatus;
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
    const transition = await this.dataSource.transaction(async (manager) => {
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

      const previousStatus = report.status;

      if (this.ensureNotAlreadyInStatus(report, targetStatus, alreadyMessage)) {
        return {
          report,
          moderator,
          previousStatus,
          targetStatus,
          action,
          notes,
          changed: false,
        };
      }
      this.ensureAllowedSourceStatuses(
        report,
        allowedSourceStatuses,
        invalidTransitionMessage,
      );

      report.status = targetStatus;
      const saved = await reportRepo.save(report);

      await this.logAction(auditRepo, id, action, performedByUserId, notes);
      return {
        report: saved,
        moderator,
        previousStatus,
        targetStatus,
        action,
        notes,
        changed: true,
      };
    });

    if (transition.changed) {
      await this.recordGlobalAudit(transition);
    }

    return this.reportsService.findOne(transition.report.reportId);
  }

  private async recordGlobalAudit(transition: ReportTransitionResult) {
    const auditAction = this.toAuditAction(transition.action);
    if (!auditAction) {
      return;
    }

    await this.auditLogService.record({
      action: auditAction,
      targetType: AuditTargetType.REPORT,
      targetId: transition.report.reportId,
      performedByUserId: transition.moderator.id,
      details: this.buildReportAuditDetails(transition),
      metadata: {
        moderationAction: transition.action,
        previousStatus: transition.previousStatus,
        nextStatus: transition.targetStatus,
        reportStatus: transition.report.status,
        notes: this.normalizeNotes(transition.notes),
        targetSnapshot: this.toReportSnapshot(transition.report),
      },
    });
  }

  private toAuditAction(action: ReportModerationAction): AuditAction | null {
    if (action === ReportModerationAction.APPROVED) {
      return AuditAction.APPROVED;
    }

    if (action === ReportModerationAction.REJECTED) {
      return AuditAction.REJECTED;
    }

    return null;
  }

  private buildReportAuditDetails(transition: ReportTransitionResult): string {
    const decision =
      transition.action === ReportModerationAction.APPROVED
        ? 'approved'
        : 'rejected';
    const notes = this.normalizeNotes(transition.notes);
    const parts = [
      `Report #${transition.report.reportId} ${decision} by ${this.formatActor(transition.moderator)}`,
      `category: ${transition.report.category}`,
      `location: ${transition.report.location}`,
      `status changed: ${transition.previousStatus} -> ${transition.targetStatus}`,
    ];

    if (notes) {
      parts.push(`notes: ${notes}`);
    }

    return parts.join('; ');
  }

  private toReportSnapshot(report: Report): Record<string, unknown> {
    return {
      category: report.category,
      location: report.location,
      description: report.description,
      status: report.status,
      confidenceScore: report.confidenceScore,
      duplicateOf: report.duplicateOf ?? null,
      submittedByUserId: report.submittedByUserId,
      latitude: report.latitude,
      longitude: report.longitude,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }

  private formatActor(user: User): string {
    return (
      [user.firstname, user.lastname]
        .filter((value) => Boolean(value && value.trim()))
        .join(' ')
        .trim() ||
      user.email ||
      `Admin #${user.id}`
    );
  }

  private normalizeNotes(notes?: string): string | null {
    const trimmed = notes?.trim();
    return trimmed || null;
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
      [ReportStatus.PENDING, ReportStatus.UNDER_REVIEW],
      'Only pending or under-review reports can be approved',
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
      [ReportStatus.PENDING, ReportStatus.UNDER_REVIEW],
      'Only pending or under-review reports can be rejected',
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
      [ReportStatus.PENDING, ReportStatus.UNDER_REVIEW, ReportStatus.APPROVED, ReportStatus.REJECTED],
      'Only pending, under-review, approved, or rejected reports can be resolved',
      notes,
    );
  }
}
