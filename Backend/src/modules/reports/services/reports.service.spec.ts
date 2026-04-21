import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ReportQueryDto } from '../dto/report-query.dto';
import { Report } from '../entities/report.entity';
import { ReportConfirmation } from '../entities/report-confirmation.entity';
import { ReportModerationAudit } from '../entities/report-moderation-audit.entity';
import { ReportVote } from '../entities/vote.entity';
import { ReportCategory } from '../enums/report-category.enum';
import { ReportStatus } from '../enums/report-status.enum';
import { ReportValidationService } from './report-validation.service';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getRepositoryToken(Report),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ReportVote),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ReportConfirmation),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ReportModerationAudit),
          useValue: {},
        },
        {
          provide: ReportValidationService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('does not exclude duplicate reports when duplicateOnly is false', () => {
    const queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
    };

    (service as any).applyQueryFilters(queryBuilder, { duplicateOnly: false });

    expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
      'report.duplicateOf IS NULL',
    );
    expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
      'report.duplicateOf IS NOT NULL',
    );
  });

  it('excludes duplicate reports only when explicitly requested', () => {
    const queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
    };

    (service as any).applyQueryFilters(queryBuilder, { excludeDuplicates: true });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'report.duplicateOf IS NULL',
    );
  });

  it('filters to duplicate reports when duplicateOnly is true', () => {
    const queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
    };

    (service as any).applyQueryFilters(queryBuilder, { duplicateOnly: true });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'report.duplicateOf IS NOT NULL',
    );
  });

  it('parses duplicateOnly string booleans without treating arbitrary values as false', () => {
    const validDto = plainToInstance(ReportQueryDto, {
      duplicateOnly: 'false',
    });
    const invalidDto = plainToInstance(ReportQueryDto, {
      duplicateOnly: 'sometimes',
    });

    expect(validateSync(validDto)).toHaveLength(0);
    expect(validDto.duplicateOnly).toBe(false);
    expect(
      validateSync(invalidDto).some(
        (error) => error.property === 'duplicateOnly',
      ),
    ).toBe(true);
  });

  it('defaults the community feed to all public non-rejected statuses', async () => {
    const findCommunityReportsPageSpy = jest
      .spyOn(service as any, 'findCommunityReportsPage')
      .mockResolvedValue({
        data: [],
        meta: {},
        counts: {},
      });

    await service.findCommunityReports({} as any, 77);

    expect(findCommunityReportsPageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: undefined,
        statuses: [
          ReportStatus.PENDING,
          ReportStatus.UNDER_REVIEW,
          ReportStatus.APPROVED,
        ],
        excludeSubmittedByUserId: undefined,
        duplicateOnly: undefined,
        excludeDuplicates: undefined,
      }),
      77,
    );
  });

  it('builds community grouping from nearby location only without category or time windows', () => {
    const queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
    };

    (service as any).applyLatestCommunityGroupFilter(queryBuilder, {
      statuses: [ReportStatus.PENDING],
    });

    const [sql, parameters] = queryBuilder.andWhere.mock.calls[0];

    expect(sql).toContain('NOT EXISTS');
    expect(sql).toContain(
      'newerReport.category IN (:...communityEffectiveReportCategories)',
    );
    expect(sql).not.toContain('newerReport.category = report.category');
    expect(sql).not.toContain('newerReport.submittedByUserId <> :excludeSubmittedByUserId');
    expect(sql).toContain('newerReport.createdAt > report.createdAt');
    expect(sql).not.toContain('timeWindow');
    expect(parameters).toEqual({
      communityEffectiveReportCategories: [
        ReportCategory.ROAD_CLOSURE,
        ReportCategory.DELAY,
        ReportCategory.ACCIDENT,
        ReportCategory.HAZARD,
        ReportCategory.OTHER,
      ],
      communityGroupStatuses: [
        ReportStatus.PENDING,
        ReportStatus.UNDER_REVIEW,
        ReportStatus.APPROVED,
      ],
      communityGroupRadiusMeters: 50,
    });
  });

  it('saves same-location reports without time-window duplicate linking', async () => {
    const reportRepo = (service as any).reportRepo;
    const validationService = (service as any).reportValidationService;
    const savedReport = {
      reportId: 51,
      duplicateOf: null,
    };

    validationService.checkRateLimit = jest.fn().mockResolvedValue(undefined);
    reportRepo.create = jest.fn((payload) => ({ ...payload }));
    reportRepo.save = jest.fn().mockResolvedValue(savedReport);
    const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue({
      reportId: 51,
      duplicateOf: null,
    } as any);

    await service.create(
      {
        category: ReportCategory.ROAD_CLOSURE,
        location: 'Awarta checkpoint',
        description: 'Awarta checkpoint is closed.',
        latitude: 32.161,
        longitude: 35.286,
      },
      9,
    );

    expect(validationService.checkRateLimit).toHaveBeenCalledWith(9);
    expect(reportRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        submittedByUserId: 9,
        duplicateOf: null,
      }),
    );
    expect(findOneSpy).toHaveBeenCalledWith(51, 9);
  });

  it('still blocks report creation when the submission rate limit fails', async () => {
    const reportRepo = (service as any).reportRepo;
    const validationService = (service as any).reportValidationService;

    validationService.checkRateLimit = jest
      .fn()
      .mockRejectedValue(new Error('Rate limit exceeded'));
    reportRepo.create = jest.fn();
    reportRepo.save = jest.fn();

    await expect(
      service.create(
        {
          category: ReportCategory.ROAD_CLOSURE,
          location: 'Awarta checkpoint',
          description: 'Awarta checkpoint is closed.',
          latitude: 32.161,
          longitude: 35.286,
        },
        9,
      ),
    ).rejects.toThrow('Rate limit exceeded');

    expect(validationService.checkRateLimit).toHaveBeenCalledWith(9);
    expect(reportRepo.create).not.toHaveBeenCalled();
    expect(reportRepo.save).not.toHaveBeenCalled();
  });

  it('marks pending reports as public and voteable for other users', () => {
    const serialized = (service as any).serializeReport(
      {
        reportId: 12,
        latitude: 31.9,
        longitude: 35.2,
        location: 'Downtown Ramallah',
        category: ReportCategory.DELAY,
        description: 'Traffic delay observed near the checkpoint.',
        status: ReportStatus.PENDING,
        submittedByUserId: 10,
        submittedByUser: null,
        createdAt: new Date('2026-04-12T20:00:00.000Z'),
        updatedAt: new Date('2026-04-12T20:00:00.000Z'),
        duplicateOf: null,
        confidenceScore: 64,
      } as Report,
      {
        upVotes: 3,
        downVotes: 1,
        totalVotes: 4,
        confirmations: 2,
        userVoteType: null,
        isConfirmedByCurrentUser: false,
      },
      {
        latestAction: null,
        latestNotes: null,
        latestActionAt: null,
      },
      99,
    );

    expect(serialized.isPubliclyVisible).toBe(true);
    expect(serialized.canVote).toBe(true);
    expect(serialized.isOwnReport).toBe(false);
    expect(serialized.canManage).toBe(false);
  });

  it('marks duplicate reports as saved but not publicly visible or voteable', () => {
    const serialized = (service as any).serializeReport(
      {
        reportId: 31,
        latitude: 31.9,
        longitude: 35.2,
        location: 'Awarta checkpoint',
        category: ReportCategory.ROAD_CLOSURE,
        description: 'Duplicate road closure report.',
        status: ReportStatus.PENDING,
        submittedByUserId: 10,
        submittedByUser: null,
        createdAt: new Date('2026-04-12T20:00:00.000Z'),
        updatedAt: new Date('2026-04-12T20:00:00.000Z'),
        duplicateOf: 12,
        confidenceScore: 0,
      } as Report,
      undefined,
      undefined,
      99,
    );

    expect(serialized.isDuplicate).toBe(true);
    expect(serialized.duplicateOf).toBe(12);
    expect(serialized.duplicateMessage).toMatch(/linked to a related report/i);
    expect(serialized.isPubliclyVisible).toBe(false);
    expect(serialized.canVote).toBe(false);
  });

  it('can treat legacy duplicate-linked rows as visible in the grouped community feed', () => {
    const serialized = (service as any).serializeReport(
      {
        reportId: 32,
        latitude: 31.9,
        longitude: 35.2,
        location: 'Awarta checkpoint',
        category: ReportCategory.ROAD_CLOSURE,
        description: 'Latest road closure report.',
        status: ReportStatus.PENDING,
        submittedByUserId: 10,
        submittedByUser: null,
        createdAt: new Date('2026-04-12T20:00:00.000Z'),
        updatedAt: new Date('2026-04-12T20:00:00.000Z'),
        duplicateOf: 12,
        confidenceScore: 0,
      } as Report,
      undefined,
      undefined,
      99,
      { treatDuplicateAsVisible: true },
    );

    expect(serialized.isPubliclyVisible).toBe(true);
    expect(serialized.canVote).toBe(true);
  });

  it('marks rejected reports as non-public and non-voteable', () => {
    const serialized = (service as any).serializeReport(
      {
        reportId: 14,
        latitude: 31.9,
        longitude: 35.2,
        location: 'North of Hebron',
        category: ReportCategory.ROAD_CLOSURE,
        description: 'Road closure reported near the northern junction.',
        status: ReportStatus.REJECTED,
        submittedByUserId: 15,
        submittedByUser: null,
        createdAt: new Date('2026-04-12T20:00:00.000Z'),
        updatedAt: new Date('2026-04-12T20:00:00.000Z'),
        duplicateOf: null,
        confidenceScore: 12,
      } as Report,
      undefined,
      undefined,
      25,
    );

    expect(serialized.isPubliclyVisible).toBe(false);
    expect(serialized.canVote).toBe(false);
    expect(serialized.canManage).toBe(false);
  });

  it('allows the owner to manage a pending report', () => {
    const serialized = (service as any).serializeReport(
      {
        reportId: 21,
        latitude: 31.9,
        longitude: 35.2,
        location: 'Qalqilya',
        category: ReportCategory.CHECKPOINT_ISSUE,
        description: 'Checkpoint congestion reported by the owner.',
        status: ReportStatus.PENDING,
        submittedByUserId: 77,
        submittedByUser: null,
        createdAt: new Date('2026-04-12T20:00:00.000Z'),
        updatedAt: new Date('2026-04-12T20:00:00.000Z'),
        duplicateOf: null,
        confidenceScore: 35,
      } as Report,
      undefined,
      undefined,
      77,
    );

    expect(serialized.isOwnReport).toBe(true);
    expect(serialized.canManage).toBe(true);
    expect(serialized.canVote).toBe(false);
  });

  it('prevents the owner from managing an approved report', () => {
    const serialized = (service as any).serializeReport(
      {
        reportId: 22,
        latitude: 31.9,
        longitude: 35.2,
        location: 'Nablus',
        category: ReportCategory.ROAD_CLOSURE,
        description: 'Approved road closure report.',
        status: ReportStatus.APPROVED,
        submittedByUserId: 88,
        submittedByUser: null,
        createdAt: new Date('2026-04-12T20:00:00.000Z'),
        updatedAt: new Date('2026-04-12T20:00:00.000Z'),
        duplicateOf: null,
        confidenceScore: 80,
      } as Report,
      undefined,
      undefined,
      88,
    );

    expect(serialized.isOwnReport).toBe(true);
    expect(serialized.canManage).toBe(false);
  });
});
