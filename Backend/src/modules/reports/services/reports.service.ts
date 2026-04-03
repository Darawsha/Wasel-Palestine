import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Report } from '../entities/report.entity';
import { Repository } from 'typeorm';
import { CreateReportDto } from '../dto/create-report.dto';
import { UpdateReportDto } from '../dto/update-report.dto';
import { ReportQueryDto } from '../dto/report-query.dto';
import { ReportValidationService } from './report-validation.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
    private readonly reportValidationService: ReportValidationService,
  ) {}

  async create(dto: CreateReportDto, userId: number) {
    const reportPayload = {
      ...dto,
      submittedByUserId: userId,
    };

    await this.reportValidationService.checkRateLimit(userId);
    await this.reportValidationService.detectSpam(reportPayload);

    const duplicate = await this.reportValidationService.findDuplicate(
      reportPayload,
    );

    const report = this.reportRepo.create({
      ...reportPayload,
      confidenceScore: 0,
    });

    if (duplicate) {
      report.duplicateOf = duplicate.reportId;
    }

    return this.reportRepo.save(report);
  }

  async findAll(query: ReportQueryDto) {
    const {
      category,
      location,
      status,
      sort,
      sortOrder,
      page = 1,
      limit = 10,
      minConfidence,
    } = query as any;

    const queryBuilder = this.reportRepo.createQueryBuilder('report');

    if (category) {
      queryBuilder.andWhere('report.category = :category', { category });
    }

    if (location) {
      queryBuilder.andWhere('report.location ILIKE :location', {
        location: `%${location}%`,
      });
    }

    if (status) {
      queryBuilder.andWhere('report.status = :status', { status });
    }

    if (minConfidence) {
      queryBuilder.andWhere('report.confidenceScore >= :min', {
        min: minConfidence,
      });
    }

    const order = sortOrder || 'DESC';

    if (sort) {
      queryBuilder.orderBy(`report.${sort}`, order);
    } else {
      queryBuilder.orderBy('report.createdAt', 'DESC');
    }

    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const report = await this.reportRepo.findOne({ where: { reportId: id } });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async update(id: number, dto: UpdateReportDto) {
    const report = await this.findOne(id);
    Object.assign(report, dto);
    return this.reportRepo.save(report);
  }
}
