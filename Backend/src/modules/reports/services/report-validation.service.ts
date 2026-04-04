import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { CreateReportDto } from '../dto/create-report.dto';
import { Report } from '../entities/report.entity';

type CreateReportValidationInput = CreateReportDto & {
  submittedByUserId: number;
};

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

  async detectSpam(dto: CreateReportValidationInput) {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const spam = await this.reportRepo.findOne({
      where: {
        submittedByUserId: dto.submittedByUserId,
        category: dto.category,
        latitude: dto.latitude,
        longitude: dto.longitude,
        createdAt: MoreThan(thirtyMinutesAgo),
      },
    });

    if (spam) {
      throw new BadRequestException(
        'Duplicate or near-duplicate report detected. Please avoid spamming.',
      );
    }
  }

  async findDuplicate(reportDto: CreateReportDto) {
    const timeWindow = new Date(Date.now() - 30 * 60 * 1000);
    return this.reportRepo
      .createQueryBuilder('report')
      .where('report.category = :category', { category: reportDto.category })
      .andWhere('report.createdAt >= :timeWindow', { timeWindow })
      .andWhere(
        `
  (6371000 * acos(
    cos(radians(:lat)) *
    cos(radians(report.latitude)) *
    cos(radians(report.longitude) - radians(:lng)) +
    sin(radians(:lat)) *
    sin(radians(report.latitude))
  )) < 50
`,
        {
          lat: reportDto.latitude,
          lng: reportDto.longitude,
        },
      )
      .getOne();
  }
}
