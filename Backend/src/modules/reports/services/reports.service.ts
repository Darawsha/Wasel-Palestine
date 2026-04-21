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
import { ReportModerationAudit } from '../entities/report-moderation-audit.entity';
import { Report } from '../entities/report.entity';
import { ReportVote } from '../entities/vote.entity';
import { VoteType } from '../enums/VoteType.enum';
import { ReportCategory } from '../enums/report-category.enum';
import {
  COMMUNITY_INTERACTIVE_REPORT_STATUSES,
  PUBLIC_COMMUNITY_REPORT_STATUSES,
  ReportStatus,
} from '../enums/report-status.enum';
import { ReportValidationService } from './report-validation.service';
import { SIMILAR_REPORT_MESSAGE } from '../utils/report-similarity.util';

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
  totalVotes: number;
  confirmations: number;
  userVoteType: VoteType | null;
  isConfirmedByCurrentUser: boolean;
};

type ReportModerationSummary = {
  latestAction: string | null;
  latestNotes: string | null;
  latestActionAt: Date | null;
};

type ReportCategoryCountRow = {
  category: ReportCategory;
  count: string;
};

type ReportPageQuery = ReportQueryDto & {
  excludeDuplicates?: boolean;
};

const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  [ReportCategory.ROAD_CLOSURE]: 'Closure',
  [ReportCategory.DELAY]: 'Delay',
  [ReportCategory.ACCIDENT]: 'Accident',
  [ReportCategory.HAZARD]: 'Weather',
  [ReportCategory.CHECKPOINT_ISSUE]: 'Checkpoint Issue',
  [ReportCategory.OTHER]: 'Other',
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
    @InjectRepository(ReportModerationAudit)
    private readonly auditRepo: Repository<ReportModerationAudit>,
    private readonly reportValidationService: ReportValidationService,
  ) {}

  async create(dto: CreateReportDto, userId: number) {
    const reportPayload = {
      ...dto,
      submittedByUserId: userId,
    };

    await this.reportValidationService.rejectRecentOwnDuplicate(reportPayload);
    await this.reportValidationService.checkRateLimit(userId);

    const duplicate = await this.reportValidationService.findDuplicate(
      reportPayload,
    );

    const report = this.reportRepo.create({
      ...reportPayload,
      confidenceScore: 0,
    });

    if (duplicate) {
      report.duplicateOf = duplicate.duplicateOf ?? duplicate.reportId;
    }

    const saved = await this.reportRepo.save(report);
    return this.findOne(saved.reportId, userId);
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
    const visibleStatuses = this.resolveCommunityStatuses(query);

    return this.findReportsPage(
      {
        ...query,
        status: undefined,
        statuses: visibleStatuses,
        excludeSubmittedByUserId: userId,
        excludeDuplicates: true,
      },
      userId,
    );
  }

  async findOne(id: number, currentUserId?: number) {
    const report = await this.reportRepo.findOne({
      where: { reportId: id },
      relations: {
        submittedByUser: true,
      },
    });
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const [serializedReport] = await this.attachInteractionSummary(
      [report],
      currentUserId,
    );
    return serializedReport;
  }

  async updateOwnReport(id: number, dto: UpdateReportDto, userId: number) {
    const report = await this.findOwnedReportOrFail(id, userId);

    this.ensureOwnerCanManage(report, 'Approved reports can no longer be edited.');

    const nextPayload: UpdateReportDto = {
      category: dto.category ?? report.category,
      location: dto.location ?? report.location,
      description: dto.description ?? report.description,
      latitude:
        typeof dto.latitude === 'number' ? dto.latitude : Number(report.latitude),
      longitude:
        typeof dto.longitude === 'number'
          ? dto.longitude
          : Number(report.longitude),
    };

    const duplicate = await this.reportValidationService.findDuplicate(
      nextPayload as CreateReportDto,
      report.reportId,
    );

    Object.assign(report, nextPayload, {
      duplicateOf: duplicate?.reportId ?? null,
    });

    const saved = await this.reportRepo.save(report);
    return this.findOne(saved.reportId, userId);
  }

  async removeOwnReport(id: number, userId: number) {
    const report = await this.findOwnedReportOrFail(id, userId);

    this.ensureOwnerCanManage(
      report,
      'Approved reports can no longer be deleted.',
    );

    await this.reportRepo.remove(report);
    return {
      deleted: true,
      reportId: id,
    };
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
      })
      .andWhere('report.duplicateOf IS NULL');
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

  async getApprovedReportsByCategories(
    categories: ReportCategory[],
  ): Promise<Report[]> {
    const normalizedCategories = Array.from(
      new Set(
        (Array.isArray(categories) ? categories : []).filter((category) =>
          Object.values(ReportCategory).includes(category),
        ),
      ),
    );

    if (normalizedCategories.length === 0) {
      return [];
    }

    return this.reportRepo
      .createQueryBuilder('report')
      .where('report.status = :status', { status: ReportStatus.APPROVED })
      .andWhere('report.duplicateOf IS NULL')
      .andWhere('report.category IN (:...categories)', {
        categories: normalizedCategories,
      })
      .orderBy('report.updatedAt', 'DESC')
      .getMany();
  }

  async getCategorySummary() {
    const categoryRows = await this.reportRepo
      .createQueryBuilder('report')
      .select('report.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('report.category')
      .getRawMany<ReportCategoryCountRow>();

    const countsByCategory = categoryRows.reduce(
      (accumulator, row) => {
        accumulator[row.category] = Number(row.count) || 0;
        return accumulator;
      },
      Object.values(ReportCategory).reduce(
        (accumulator, category) => {
          accumulator[category] = 0;
          return accumulator;
        },
        {} as Record<ReportCategory, number>,
      ),
    );

    const total = Object.values(countsByCategory).reduce(
      (sum, count) => sum + count,
      0,
    );

    return {
      total,
      categories: Object.values(ReportCategory).map((category) => ({
        category,
        label: REPORT_CATEGORY_LABELS[category],
        count: countsByCategory[category] ?? 0,
        percentage:
          total > 0
            ? Number(
                (((countsByCategory[category] ?? 0) / total) * 100).toFixed(1),
              )
            : 0,
      })),
    };
  }

  private async findReportsPage(
    query: ReportPageQuery,
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
    query: ReportPageQuery,
    options: { includeDistanceSelect?: boolean } = {},
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
      excludeDuplicates,
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
    } else if (excludeDuplicates === true) {
      queryBuilder.andWhere('report.duplicateOf IS NULL');
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

    if (options.includeDistanceSelect !== false) {
      queryBuilder.addSelect(distanceSql, 'distanceKm');
    }

    queryBuilder.andWhere(`${distanceSql} <= :radiusKm`, {
      latitude,
      longitude,
      radiusKm: normalizedRadiusKm,
    });
  }

  private async getStatusCounts(query: ReportPageQuery) {
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
    }, { includeDistanceSelect: false });

    const countRows = await countQueryBuilder.getRawMany<{
      status: ReportStatus;
      count: string;
    }>();

    const countsByStatus = countRows.reduce<Record<ReportStatus, number>>(
      (accumulator, row) => {
        accumulator[row.status] = Number(row.count) || 0;
        return accumulator;
      },
      {
        [ReportStatus.PENDING]: 0,
        [ReportStatus.UNDER_REVIEW]: 0,
        [ReportStatus.APPROVED]: 0,
        [ReportStatus.REJECTED]: 0,
        [ReportStatus.RESOLVED]: 0,
      },
    );

    return {
      all: Object.values(countsByStatus).reduce(
        (total, count) => total + count,
        0,
      ),
      // Pending bucket includes items still in moderation queue.
      pending:
        countsByStatus[ReportStatus.PENDING] +
        countsByStatus[ReportStatus.UNDER_REVIEW],
      // Verified bucket maps to accepted/resolved reports.
      verified:
        countsByStatus[ReportStatus.APPROVED] +
        countsByStatus[ReportStatus.RESOLVED],
      rejected: countsByStatus[ReportStatus.REJECTED],
    };
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

  private isAuthenticatedUserId(currentUserId?: number): currentUserId is number {
    return Number.isInteger(currentUserId) && Number(currentUserId) > 0;
  }

  private isPubliclyVisibleStatus(status: ReportStatus): boolean {
    return PUBLIC_COMMUNITY_REPORT_STATUSES.includes(status);
  }

  private isOwnerEditableStatus(status: ReportStatus): boolean {
    return ![ReportStatus.APPROVED, ReportStatus.RESOLVED].includes(status);
  }

  private async findOwnedReportOrFail(id: number, userId: number) {
    const report = await this.reportRepo.findOne({
      where: {
        reportId: id,
        submittedByUserId: userId,
      },
      relations: {
        submittedByUser: true,
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  private ensureOwnerCanManage(report: Report, message: string) {
    if (!this.isOwnerEditableStatus(report.status)) {
      throw new BadRequestException(message);
    }
  }

  private canCurrentUserVote(report: Report, currentUserId?: number): boolean {
    if (!this.isAuthenticatedUserId(currentUserId)) {
      return false;
    }

    if (!COMMUNITY_INTERACTIVE_REPORT_STATUSES.includes(report.status)) {
      return false;
    }

    if (this.isDuplicateReport(report)) {
      return false;
    }

    return report.submittedByUserId !== currentUserId;
  }

  private isDuplicateReport(report: Report): boolean {
    return Number(report.duplicateOf) > 0;
  }

  private serializeReport(
    report: Report,
    interactionSummary?: ReportInteractionSummary,
    moderationSummary?: ReportModerationSummary,
    currentUserId?: number,
  ) {
    const isOwnReport =
      this.isAuthenticatedUserId(currentUserId) &&
      report.submittedByUserId === currentUserId;
    const canManage = isOwnReport && this.isOwnerEditableStatus(report.status);
    const duplicateOf = report.duplicateOf ?? null;
    const isDuplicate = this.isDuplicateReport(report);

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
      duplicateOf,
      isDuplicate,
      duplicateMessage: isDuplicate ? SIMILAR_REPORT_MESSAGE : null,
      confidenceScore: report.confidenceScore,
      isPubliclyVisible:
        this.isPubliclyVisibleStatus(report.status) && !isDuplicate,
      isOwnReport,
      canManage,
      canVote: this.canCurrentUserVote(report, currentUserId),
      interactionSummary: interactionSummary ?? this.createEmptyInteractionSummary(),
      moderationSummary: moderationSummary ?? this.createEmptyModerationSummary(),
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
    const hasCurrentUser = this.isAuthenticatedUserId(currentUserId);

    const userVotesPromise = hasCurrentUser
      ? this.voteRepo.find({
          where: {
            reportId: In(reportIds),
            userId: currentUserId,
          },
        })
      : Promise.resolve([] as ReportVote[]);

    const userConfirmationsPromise = hasCurrentUser
      ? this.confirmRepo.find({
          where: {
            reportId: In(reportIds),
            userId: currentUserId,
          },
        })
      : Promise.resolve([] as ReportConfirmation[]);

    const [
      voteCounts,
      confirmationCounts,
      userVotes,
      userConfirmations,
      auditRows,
    ] = await Promise.all([
      this.voteRepo
        .createQueryBuilder('vote')
        .select('vote.reportId', 'reportId')
        .addSelect('vote.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .where('vote.reportId IN (:...reportIds)', { reportIds })
        .groupBy('vote.reportId')
        .addGroupBy('vote.type')
        .getRawMany<{ reportId: string; type: VoteType; count: string }>(),
      this.confirmRepo
        .createQueryBuilder('confirmation')
        .select('confirmation.reportId', 'reportId')
        .addSelect('COUNT(*)', 'count')
        .where('confirmation.reportId IN (:...reportIds)', { reportIds })
        .groupBy('confirmation.reportId')
        .getRawMany<{ reportId: string; count: string }>(),
      userVotesPromise,
      userConfirmationsPromise,
      this.auditRepo
        .createQueryBuilder('audit')
        .select('audit.reportId', 'reportId')
        .addSelect('audit.action', 'action')
        .addSelect('audit.notes', 'notes')
        .addSelect('audit.createdAt', 'createdAt')
        .where('audit.reportId IN (:...reportIds)', { reportIds })
        .orderBy('audit.reportId', 'ASC')
        .addOrderBy('audit.createdAt', 'DESC')
        .addOrderBy('audit.id', 'DESC')
        .getRawMany<{
          reportId: string;
          action: string | null;
          notes: string | null;
          createdAt: Date | string | null;
        }>(),
    ]);

    const summaries = new Map<number, ReportInteractionSummary>();
    const moderationSummaries = new Map<number, ReportModerationSummary>();

    reports.forEach((report) => {
      summaries.set(report.reportId, this.createEmptyInteractionSummary());
      moderationSummaries.set(report.reportId, this.createEmptyModerationSummary());
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

    summaries.forEach((summary) => {
      summary.totalVotes = summary.upVotes + summary.downVotes;
    });

    auditRows.forEach((row) => {
      const reportId = Number(row.reportId);
      const moderationSummary = moderationSummaries.get(reportId);

      if (!moderationSummary || moderationSummary.latestActionAt) {
        return;
      }

      const createdAt = row.createdAt ? new Date(row.createdAt) : null;

      moderationSummary.latestAction = row.action ?? null;
      moderationSummary.latestNotes =
        typeof row.notes === 'string' && row.notes.trim()
          ? row.notes.trim()
          : null;
      moderationSummary.latestActionAt =
        createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt : null;
    });

    return reports.map((report) =>
      this.serializeReport(
        report,
        summaries.get(report.reportId),
        moderationSummaries.get(report.reportId),
        currentUserId,
      ),
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

  private resolveCommunityStatuses(query: ReportQueryDto): ReportStatus[] {
    const requestedStatuses =
      Array.isArray(query.statuses) && query.statuses.length > 0
        ? query.statuses
        : query.status
          ? [query.status]
          : [];

    if (requestedStatuses.length === 0) {
      return [...PUBLIC_COMMUNITY_REPORT_STATUSES];
    }

    const visibleStatuses = requestedStatuses.filter((status) =>
      PUBLIC_COMMUNITY_REPORT_STATUSES.includes(status),
    );

    return visibleStatuses.length > 0
      ? visibleStatuses
      : [...PUBLIC_COMMUNITY_REPORT_STATUSES];
  }

  private createEmptyInteractionSummary(): ReportInteractionSummary {
    return {
      upVotes: 0,
      downVotes: 0,
      totalVotes: 0,
      confirmations: 0,
      userVoteType: null,
      isConfirmedByCurrentUser: false,
    };
  }

  private createEmptyModerationSummary(): ReportModerationSummary {
    return {
      latestAction: null,
      latestNotes: null,
      latestActionAt: null,
    };
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
