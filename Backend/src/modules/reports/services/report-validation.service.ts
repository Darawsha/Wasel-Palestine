import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { CreateReportDto } from '../dto/create-report.dto';
import { Report } from '../entities/report.entity';
import {
  getRecentOwnDuplicateReportThreshold,
  getRecentSimilarReportThreshold,
  haveSameEffectiveReportMeaning,
  OWN_DUPLICATE_REPORT_MESSAGE,
  SIMILAR_REPORT_LOCATION_RADIUS_METERS,
} from '../utils/report-similarity.util';

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

  async rejectRecentOwnDuplicate(dto: CreateReportValidationInput) {
    const timeWindow = getRecentOwnDuplicateReportThreshold();
    const candidates = await this.reportRepo
      .createQueryBuilder('report')
      .where('report.submittedByUserId = :submittedByUserId', {
        submittedByUserId: dto.submittedByUserId,
      })
      .andWhere('report.category = :category', { category: dto.category })
      .andWhere('report.createdAt >= :timeWindow', { timeWindow })
      .andWhere(
        `
  (6371000 * acos(
    cos(radians(:lat)) *
    cos(radians(report.latitude)) *
    cos(radians(report.longitude) - radians(:lng)) +
    sin(radians(:lat)) *
    sin(radians(report.latitude))
  )) <= :radiusMeters
`,
        {
          lat: dto.latitude,
          lng: dto.longitude,
          radiusMeters: SIMILAR_REPORT_LOCATION_RADIUS_METERS,
        },
      )
      .orderBy('report.createdAt', 'DESC')
      .getMany();

    const duplicate = candidates.find((candidate) =>
      haveSameEffectiveReportMeaning(dto, candidate),
    );

    if (duplicate) {
      throw new BadRequestException(OWN_DUPLICATE_REPORT_MESSAGE);
    }
  }

  async findDuplicate(reportDto: CreateReportDto, excludeReportId?: number) {
    const timeWindow = getRecentSimilarReportThreshold();
    const queryBuilder = this.reportRepo
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
  )) <= :radiusMeters
`,
        {
          lat: reportDto.latitude,
          lng: reportDto.longitude,
          radiusMeters: SIMILAR_REPORT_LOCATION_RADIUS_METERS,
        },
      );

    if (Number.isInteger(excludeReportId) && Number(excludeReportId) > 0) {
      queryBuilder.andWhere('report.reportId <> :excludeReportId', {
        excludeReportId,
      });
    }

    const candidates = await queryBuilder
      .orderBy('report.createdAt', 'DESC')
      .getMany();

    return (
      candidates.find((candidate) =>
        haveSameEffectiveReportMeaning(reportDto, candidate),
      ) ?? null
    );
  }
}
