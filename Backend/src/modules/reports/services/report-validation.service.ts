import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { Report } from '../entities/report.entity';

@Injectable()
export class ReportValidationService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
  ) {}

  async checkRateLimit(userId: number) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentCount = await this.reportRepo.count({
      where: { submittedByUserId: userId, createdAt: MoreThan(fiveMinutesAgo) },
    });

    if (recentCount >= 3) {
      throw new BadRequestException(
        'Rate limit exceeded: You can only submit 3 reports every 5 minutes.',
      );
    }
  }
}
