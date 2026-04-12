import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  In,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { MapFilterQueryDto } from '../../map/dto/map-filter-query.dto';
import { IncidentType } from '../../incidents/enums/incident-type.enum';
import { User } from '../../users/entities/user.entity';
import { CreateReportDto } from '../dto/create-report.dto';
import { ReportQueryDto } from '../dto/report-query.dto';
import { UpdateReportDto } from '../dto/update-report.dto';
import { ReportConfirmation } from '../entities/report-confirmation.entity';
import { Report } from '../entities/report.entity';
import { ReportVote } from '../entities/vote.entity';
import { VoteType } from '../enums/VoteType.enum';
import { ReportCategory } from '../enums/report-category.enum';
import { ReportStatus } from '../enums/report-status.enum';
import { ReportValidationService } from './report-validation.service';

const MAP_VISIBLE_REPORT_STATUSES = [
  ReportStatus.PENDING,
  ReportStatus.UNDER_REVIEW,
  ReportStatus.APPROVED,
];

const MODERATION_QUEUE_VISIBLE_STATUSES = [
  ReportStatus.PENDING,
  ReportStatus.UNDER_REVIEW,
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

type ReportInteractionSummary = {
  upVotes: number;
  downVotes: number;
  confirmations: number;
  userVoteType: VoteType | null;
  isConfirmedByCurrentUser: boolean;
};

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
    @InjectRepository(ReportVote)
    private readonly voteRepo: Repository<ReportVote>,
    @InjectRepository(ReportConfirmation)
    private readonly confirmRepo: Repository<ReportConfirmation>,
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

    const saved = await this.reportRepo.save(report);
    return this.findOne(saved.reportId);
  }

  async findAll(query: ReportQueryDto) {
    const hasExplicitStatusFilter =
      Boolean(query.status) ||
      (Array.isArray(query.statuses) && query.statuses.length > 0);

    if (hasExplicitStatusFilter) {
      return this.findReportsPage(query);
    }

    return this.findReportsPage({
      ...query,
      statuses: MODERATION_QUEUE_VISIBLE_STATUSES,
    });
  }

  async findMyReports(query: ReportQueryDto, userId: number) {
    return this.findReportsPage(
      {
        ...query,
        submittedByUserId: userId,
      },
      userId,
    );
  }

  async findCommunityReports(query: ReportQueryDto, userId: number) {
    return this.findReportsPage(
      {
        ...query,
        status: query.status ?? ReportStatus.PENDING,
        excludeSubmittedByUserId: userId,
      },
      userId,
    );
  }

  async findOne(id: number) {
    const report = await this.reportRepo.findOne({
      where: { reportId: id },
      relations: {
        submittedByUser: true,
      },
    });
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const [serializedReport] = await this.attachInteractionSummary([report]);
    return serializedReport;
  }

  async update(id: number, dto: UpdateReportDto) {
    const report = await this.reportRepo.findOne({ where: { reportId: id } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    Object.assign(report, dto);
    const saved = await this.reportRepo.save(report);
    return this.findOne(saved.reportId);
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
      queryBuilder.andWhere(
        'report.createdAt BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        },
      );
    }

    return queryBuilder.orderBy('report.updatedAt', 'DESC').getMany();
  }

  private async findReportsPage(
    query: ReportQueryDto,
    currentUserId?: number,
  ) {
    const {
      page = 1,
      limit = 10,
      sort,
      sortOrder,
    } = query;

    const queryBuilder = this.reportRepo
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.submittedByUser', 'submittedByUser');

    this.applyQueryFilters(queryBuilder, query);

    if (sort) {
      queryBuilder.orderBy(`report.${sort}`, sortOrder || 'DESC');
    } else {
      queryBuilder.orderBy('report.createdAt', 'DESC');
    }

    queryBuilder.skip((page - 1) * limit).take(limit);

    const [reports, total] = await queryBuilder.getManyAndCount();
    const data = await this.attachInteractionSummary(reports, currentUserId);
    const counts = await this.getStatusCounts(query);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
      counts,
    };
  }

  private applyQueryFilters(
    queryBuilder: SelectQueryBuilder<Report>,
    query: ReportQueryDto,
  ) {
    const {
      submittedByUserId,
      excludeSubmittedByUserId,
      category,
      location,
      status,
      statuses,
      search,
      minConfidence,
      latitude,
      longitude,
      radiusKm,
      duplicateOnly,
    } = query;

    if (submittedByUserId) {
      queryBuilder.andWhere('report.submittedByUserId = :submittedByUserId', {
        submittedByUserId,
      });
    }

    if (excludeSubmittedByUserId) {
      queryBuilder.andWhere(
        'report.submittedByUserId <> :excludeSubmittedByUserId',
        {
          excludeSubmittedByUserId,
        },
      );
    }

    if (category) {
      queryBuilder.andWhere('report.category = :category', { category });
    }

    if (location) {
      queryBuilder.andWhere('LOWER(report.location) LIKE LOWER(:location)', {
        location: `%${location}%`,
      });
    }

    if (Array.isArray(statuses) && statuses.length > 0) {
      queryBuilder.andWhere('report.status IN (:...statuses)', {
        statuses,
      });
    } else if (status) {
      queryBuilder.andWhere('report.status = :status', { status });
    }

    if (typeof minConfidence === 'number') {
      queryBuilder.andWhere('report.confidenceScore >= :minConfidence', {
        minConfidence,
      });
    }

    if (duplicateOnly === true) {
      queryBuilder.andWhere('report.duplicateOf IS NOT NULL');
    }

    if (search && search.trim()) {
      const normalizedSearch = `%${search.trim().toLowerCase()}%`;
      queryBuilder.andWhere(
        new Brackets((searchBuilder) => {
          searchBuilder
            .where('LOWER(report.location) LIKE :search', {
              search: normalizedSearch,
            })
            .orWhere('LOWER(report.description) LIKE :search', {
              search: normalizedSearch,
            })
            .orWhere('LOWER(report.category) LIKE :search', {
              search: normalizedSearch,
            })
            .orWhere(
              "LOWER(CONCAT(COALESCE(submittedByUser.firstname, ''), ' ', COALESCE(submittedByUser.lastname, ''))) LIKE :search",
              {
                search: normalizedSearch,
              },
            )
            .orWhere("LOWER(COALESCE(submittedByUser.email, '')) LIKE :search", {
              search: normalizedSearch,
            });
        }),
      );
    }

    const hasLatitude = typeof latitude === 'number';
    const hasLongitude = typeof longitude === 'number';

    if (hasLatitude !== hasLongitude) {
      throw new BadRequestException(
        'latitude and longitude must be provided together.',
      );
    }

    if (!hasLatitude || !hasLongitude) {
      return;
    }

    const normalizedRadiusKm = radiusKm ?? 25;
    const distanceSql = this.buildDistanceSql();

    queryBuilder
      .addSelect(distanceSql, 'distanceKm')
      .andWhere(`${distanceSql} <= :radiusKm`, {
        latitude,
        longitude,
        radiusKm: normalizedRadiusKm,
      });
  }

  private async getStatusCounts(query: ReportQueryDto) {
    const countQueryBuilder = this.reportRepo
      .createQueryBuilder('report')
      .leftJoin('report.submittedByUser', 'submittedByUser')
      .select('report.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('report.status');

    this.applyQueryFilters(countQueryBuilder, {
      ...query,
      status: undefined,
      statuses: undefined,
      page: undefined,
      limit: undefined,
      sort: undefined,
      sortOrder: undefined,
    });

    const countRows = await countQueryBuilder.getRawMany<{
      status: ReportStatus;
      count: string;
    }>();

    return countRows.reduce<Record<string, number>>((accumulator, row) => {
      accumulator[row.status] = Number(row.count) || 0;
      return accumulator;
    }, {});
  }

  private buildDistanceSql() {
    return `
      6371 * acos(
        cos(radians(:latitude)) *
        cos(radians(report.latitude)) *
        cos(radians(report.longitude) - radians(:longitude)) +
        sin(radians(:latitude)) *
        sin(radians(report.latitude))
      )
    `;
  }

  private sanitizeSubmittedByUser(user?: User | null) {
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
    };
  }

  private serializeReport(
    report: Report,
    interactionSummary?: ReportInteractionSummary,
  ) {
    return {
      reportId: report.reportId,
      latitude: report.latitude,
      longitude: report.longitude,
      location: report.location,
      category: report.category,
      description: report.description,
      status: report.status,
      submittedByUserId: report.submittedByUserId,
      submittedByUser: this.sanitizeSubmittedByUser(report.submittedByUser),
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      duplicateOf: report.duplicateOf ?? null,
      confidenceScore: report.confidenceScore,
      interactionSummary: interactionSummary ?? {
        upVotes: 0,
        downVotes: 0,
        confirmations: 0,
        userVoteType: null,
        isConfirmedByCurrentUser: false,
      },
    };
  }

  private async attachInteractionSummary(
    reports: Report[],
    currentUserId?: number,
  ) {
    if (reports.length === 0) {
      return [];
    }

    const reportIds = reports.map((report) => report.reportId);

    const voteCounts = await this.voteRepo
      .createQueryBuilder('vote')
      .select('vote.reportId', 'reportId')
      .addSelect('vote.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('vote.reportId IN (:...reportIds)', { reportIds })
      .groupBy('vote.reportId')
      .addGroupBy('vote.type')
      .getRawMany<{ reportId: string; type: VoteType; count: string }>();

    const confirmationCounts = await this.confirmRepo
      .createQueryBuilder('confirmation')
      .select('confirmation.reportId', 'reportId')
      .addSelect('COUNT(*)', 'count')
      .where('confirmation.reportId IN (:...reportIds)', { reportIds })
      .groupBy('confirmation.reportId')
      .getRawMany<{ reportId: string; count: string }>();

    const userVotes =
      currentUserId && Number.isInteger(currentUserId)
        ? await this.voteRepo.find({
            where: {
              reportId: In(reportIds),
              userId: currentUserId,
            },
          })
        : [];

    const userConfirmations =
      currentUserId && Number.isInteger(currentUserId)
        ? await this.confirmRepo.find({
            where: {
              reportId: In(reportIds),
              userId: currentUserId,
            },
          })
        : [];

    const summaries = new Map<number, ReportInteractionSummary>();

    reports.forEach((report) => {
      summaries.set(report.reportId, {
        upVotes: 0,
        downVotes: 0,
        confirmations: 0,
        userVoteType: null,
        isConfirmedByCurrentUser: false,
      });
    });

    voteCounts.forEach((row) => {
      const reportId = Number(row.reportId);
      const summary = summaries.get(reportId);

      if (!summary) {
        return;
      }

      if (row.type === VoteType.UP) {
        summary.upVotes = Number(row.count) || 0;
      } else if (row.type === VoteType.DOWN) {
        summary.downVotes = Number(row.count) || 0;
      }
    });

    confirmationCounts.forEach((row) => {
      const reportId = Number(row.reportId);
      const summary = summaries.get(reportId);

      if (!summary) {
        return;
      }

      summary.confirmations = Number(row.count) || 0;
    });

    userVotes.forEach((vote) => {
      const summary = summaries.get(vote.reportId);

      if (!summary) {
        return;
      }

      summary.userVoteType = vote.type;
    });

    userConfirmations.forEach((confirmation) => {
      const summary = summaries.get(confirmation.reportId);

      if (!summary) {
        return;
      }

      summary.isConfirmedByCurrentUser = true;
    });

    return reports.map((report) =>
      this.serializeReport(report, summaries.get(report.reportId)),
    );
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

  private assertValidMapDateRange(startDate?: Date, endDate?: Date): void {
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
