import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Report } from '../entities/report.entity';
import { Repository } from 'typeorm';
import { CreateReportDto } from '../dto/create-report.dto';
import { UpdateReportDto } from '../dto/update-report.dto';
import { ReportQueryDto } from '../dto/report-query.dto';
import { ReportValidationService } from './report-validation.service';
import { ReportStatus } from '../enums/report-status.enum';
import { ReportCategory } from '../enums/report-category.enum';
import { MapFilterQueryDto } from '../../map/dto/map-filter-query.dto';
import { IncidentType } from '../../incidents/enums/incident-type.enum';

const MAP_VISIBLE_REPORT_STATUSES = [
  ReportStatus.PENDING,
  ReportStatus.UNDER_REVIEW,
  ReportStatus.APPROVED,
];

const REPORT_CATEGORIES_BY_INCIDENT_TYPE: Partial<
  Record<IncidentType, ReportCategory[]>
> = {
  [IncidentType.CLOSURE]: [
    ReportCategory.ROAD_CLOSURE,
    ReportCategory.CHECKPOINT_ISSUE,
  ],
  [IncidentType.DELAY]: [
    ReportCategory.DELAY,
    ReportCategory.CHECKPOINT_ISSUE,
  ],
  [IncidentType.ACCIDENT]: [ReportCategory.ACCIDENT],
  [IncidentType.WEATHER_HAZARD]: [ReportCategory.HAZARD],
};

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

  async getMapReports(filterDto: MapFilterQueryDto): Promise<Report[]> {
    const { types, startDate, endDate } = filterDto;
    this.assertValidMapDateRange(startDate, endDate);

    const queryBuilder = this.reportRepo
      .createQueryBuilder('report')
      .where('report.status IN (:...statuses)', {
        statuses: MAP_VISIBLE_REPORT_STATUSES,
      });
    const reportCategories = this.resolveReportCategories(types);

    if (Array.isArray(types) && types.length > 0) {
      if (reportCategories.length === 0) {
        return [];
      }

      queryBuilder.andWhere('report.category IN (:...categories)', {
        categories: reportCategories,
      });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('report.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    return queryBuilder.orderBy('report.updatedAt', 'DESC').getMany();
  }

  private resolveReportCategories(
    incidentTypes?: IncidentType[],
  ): ReportCategory[] {
    if (!Array.isArray(incidentTypes) || incidentTypes.length === 0) {
      return [];
    }

    return Array.from(
      new Set(
        incidentTypes.flatMap(
          (incidentType) =>
            REPORT_CATEGORIES_BY_INCIDENT_TYPE[incidentType] ?? [],
        ),
      ),
    );
  }

  private assertValidMapDateRange(
    startDate?: Date,
    endDate?: Date,
  ): void {
    const hasStartDate = Boolean(startDate);
    const hasEndDate = Boolean(endDate);

    if (hasStartDate !== hasEndDate) {
      throw new BadRequestException(
        'startDate and endDate must be provided together.',
      );
    }

    if (!hasStartDate || !hasEndDate) {
      return;
    }

    if (startDate.getTime() > endDate.getTime()) {
      throw new BadRequestException('startDate must be before endDate.');
    }
  }
}
