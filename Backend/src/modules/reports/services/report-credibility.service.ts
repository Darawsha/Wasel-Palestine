import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ReportVote } from '../entities/vote.entity';
import { ReportConfirmation } from '../entities/report-confirmation.entity';
import { Repository } from 'typeorm';
import { Report } from '../entities/report.entity';
import { VoteType } from '../enums/VoteType.enum';
import { InjectRepository } from '@nestjs/typeorm';
@Injectable()
export class ReportCredibilityService {
  constructor(
    @InjectRepository(ReportVote)
    private voteRepo: Repository<ReportVote>,

    @InjectRepository(ReportConfirmation)
    private confirmRepo: Repository<ReportConfirmation>,

    @InjectRepository(Report)
    private reportRepo: Repository<Report>,
  ) {}

  calculateScore(up: number, down: number, confirmations: number) {
    const total = up + down + confirmations;
    if (total === 0) return 0;

    return Math.round(((up + confirmations) / total) * 100);
  }

  async updateReportConfidence(reportId: number) {
    const up = await this.voteRepo.count({
      where: { reportId, type: VoteType.UP },
    });
    const down = await this.voteRepo.count({
      where: { reportId, type: VoteType.DOWN },
    });
    const confirmations = await this.confirmRepo.count({ where: { reportId } });

    const score = this.calculateScore(up, down, confirmations);

    await this.reportRepo.update(reportId, {
      confidenceScore: score,
    });
  }

  async vote(reportId: number, userId: number, type: 'UP' | 'DOWN') {
    if (!userId) {
      throw new BadRequestException('User ID is required to vote');
    }

    const report = await this.reportRepo.findOne({ where: { reportId } });
    if (!report) throw new NotFoundException('Report not found');

    const exists = await this.voteRepo.findOne({ where: { reportId, userId } });
    if (exists) {
      if (exists.type === type) {
        throw new BadRequestException('Already voted with this type');
      }

      // Update vote type if it changed
      exists.type = type as VoteType;
      await this.voteRepo.save(exists);
    } else {
      await this.voteRepo.save({ reportId, userId, type: type as VoteType });
    }

    await this.updateReportConfidence(reportId);
  }

  async confirm(reportId: number, userId: number) {
    if (!userId) {
      throw new BadRequestException('User ID is required to confirm');
    }

    const report = await this.reportRepo.findOne({ where: { reportId } });
    if (!report) throw new NotFoundException('Report not found');

    const exists = await this.confirmRepo.findOne({
      where: { reportId, userId },
    });
    if (exists) throw new BadRequestException('Already confirmed');

    await this.confirmRepo.save({ reportId, userId });

    await this.updateReportConfidence(reportId);
  }
}
