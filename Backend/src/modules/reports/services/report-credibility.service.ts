import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportConfirmation } from '../entities/report-confirmation.entity';
import { Report } from '../entities/report.entity';
import { ReportVote } from '../entities/vote.entity';
import { VoteType } from '../enums/VoteType.enum';
import { COMMUNITY_INTERACTIVE_REPORT_STATUSES } from '../enums/report-status.enum';

@Injectable()
export class ReportCredibilityService {
  constructor(
    @InjectRepository(ReportVote)
    private readonly voteRepo: Repository<ReportVote>,
    @InjectRepository(ReportConfirmation)
    private readonly confirmRepo: Repository<ReportConfirmation>,
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
  ) {}

  calculateScore(up: number, down: number) {
    const total = up + down;
    if (total === 0) return 0;

    return Math.round((up / total) * 100);
  }

  async updateReportConfidence(reportId: number) {
    const up = await this.voteRepo.count({
      where: { reportId, type: VoteType.UP },
    });
    const down = await this.voteRepo.count({
      where: { reportId, type: VoteType.DOWN },
    });

    const score = this.calculateScore(up, down);

    await this.reportRepo.update(reportId, {
      confidenceScore: score,
    });

    return score;
  }

  private ensureInteractiveStatus(report: Report) {
    if (!COMMUNITY_INTERACTIVE_REPORT_STATUSES.includes(report.status)) {
      throw new BadRequestException(
        'Community interactions are only allowed on public reports that are still active',
      );
    }
  }

  private canUserInteract(report: Report, userId: number): boolean {
    if (!userId) {
      return false;
    }

    if (!COMMUNITY_INTERACTIVE_REPORT_STATUSES.includes(report.status)) {
      return false;
    }

    return report.submittedByUserId !== userId;
  }

  private async buildInteractionResponse(
    report: Report,
    userId: number,
    confidenceScore?: number,
  ) {
    const reportId = report.reportId;
    const upVotes = await this.voteRepo.count({
      where: { reportId, type: VoteType.UP },
    });
    const downVotes = await this.voteRepo.count({
      where: { reportId, type: VoteType.DOWN },
    });
    const confirmations = await this.confirmRepo.count({ where: { reportId } });
    const userVote = await this.voteRepo.findOne({
      where: { reportId, userId },
    });
    const userConfirmation = await this.confirmRepo.findOne({
      where: { reportId, userId },
    });

    return {
      reportId,
      confidenceScore:
        typeof confidenceScore === 'number'
          ? confidenceScore
          : this.calculateScore(upVotes, downVotes),
      interactionSummary: {
        upVotes,
        downVotes,
        totalVotes: upVotes + downVotes,
        confirmations,
        userVoteType: userVote?.type ?? null,
        isConfirmedByCurrentUser: Boolean(userConfirmation),
      },
      canVote: this.canUserInteract(report, userId),
    };
  }

  async vote(reportId: number, userId: number, type: 'UP' | 'DOWN') {
    if (!userId) {
      throw new BadRequestException('User ID is required to vote');
    }

    const report = await this.reportRepo.findOne({ where: { reportId } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    this.ensureInteractiveStatus(report);

    const existingVote = await this.voteRepo.findOne({
      where: { reportId, userId },
    });

    if (existingVote) {
      if (existingVote.type === type) {
        throw new BadRequestException('Already voted with this type');
      }

      existingVote.type = type as VoteType;
      await this.voteRepo.save(existingVote);
    } else {
      await this.voteRepo.save({
        reportId,
        userId,
        type: type as VoteType,
      });
    }

    const confidenceScore = await this.updateReportConfidence(reportId);
    const refreshedReport = await this.reportRepo.findOne({ where: { reportId } });
    return this.buildInteractionResponse(
      refreshedReport ?? report,
      userId,
      confidenceScore,
    );
  }

  async confirm(reportId: number, userId: number) {
    if (!userId) {
      throw new BadRequestException('User ID is required to confirm');
    }

    const report = await this.reportRepo.findOne({ where: { reportId } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    this.ensureInteractiveStatus(report);

    const existingConfirmation = await this.confirmRepo.findOne({
      where: { reportId, userId },
    });

    if (existingConfirmation) {
      throw new BadRequestException('Already confirmed');
    }

    await this.confirmRepo.save({ reportId, userId });

    const confidenceScore = await this.updateReportConfidence(reportId);
    const refreshedReport = await this.reportRepo.findOne({ where: { reportId } });
    return this.buildInteractionResponse(
      refreshedReport ?? report,
      userId,
      confidenceScore,
    );
  }
}
