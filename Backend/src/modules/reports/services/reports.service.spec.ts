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

  it('excludes duplicate reports when public feeds request duplicate suppression', () => {
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
    const findReportsPageSpy = jest
      .spyOn(service as any, 'findReportsPage')
      .mockResolvedValue({
        data: [],
        meta: {},
        counts: {},
      });

    await service.findCommunityReports({} as any, 77);

    expect(findReportsPageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: undefined,
        statuses: [
          ReportStatus.PENDING,
          ReportStatus.UNDER_REVIEW,
          ReportStatus.APPROVED,
        ],
        excludeSubmittedByUserId: 77,
        excludeDuplicates: true,
      }),
      77,
    );
  });

  it('saves similar reports and links them to the original instead of blocking submission', async () => {
    const reportRepo = (service as any).reportRepo;
    const validationService = (service as any).reportValidationService;
    const savedReport = {
      reportId: 51,
      duplicateOf: 42,
    };

    validationService.rejectRecentOwnDuplicate = jest.fn().mockResolvedValue(undefined);
    validationService.checkRateLimit = jest.fn().mockResolvedValue(undefined);
    validationService.findDuplicate = jest.fn().mockResolvedValue({
      reportId: 42,
      duplicateOf: null,
    });
    reportRepo.create = jest.fn((payload) => ({ ...payload }));
    reportRepo.save = jest.fn().mockResolvedValue(savedReport);
    const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue({
      reportId: 51,
      duplicateOf: 42,
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

    expect(validationService.rejectRecentOwnDuplicate).toHaveBeenCalledWith(
      expect.objectContaining({
        submittedByUserId: 9,
        category: ReportCategory.ROAD_CLOSURE,
      }),
    );
    expect(validationService.checkRateLimit).toHaveBeenCalledWith(9);
    expect(validationService.findDuplicate).toHaveBeenCalled();
    expect(reportRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        submittedByUserId: 9,
        duplicateOf: 42,
      }),
    );
    expect(findOneSpy).toHaveBeenCalledWith(51, 9);
  });

  it('links a similar report to the root original when the matched report is also duplicate', async () => {
    const reportRepo = (service as any).reportRepo;
    const validationService = (service as any).reportValidationService;

    validationService.rejectRecentOwnDuplicate = jest.fn().mockResolvedValue(undefined);
    validationService.checkRateLimit = jest.fn().mockResolvedValue(undefined);
    validationService.findDuplicate = jest.fn().mockResolvedValue({
      reportId: 43,
      duplicateOf: 42,
    });
    reportRepo.create = jest.fn((payload) => ({ ...payload }));
    reportRepo.save = jest.fn().mockResolvedValue({
      reportId: 52,
      duplicateOf: 42,
    });
    jest.spyOn(service, 'findOne').mockResolvedValue({
      reportId: 52,
      duplicateOf: 42,
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

    expect(reportRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        duplicateOf: 42,
      }),
    );
  });

  it('does not save a report when the same user submitted the same report recently', async () => {
    const reportRepo = (service as any).reportRepo;
    const validationService = (service as any).reportValidationService;

    validationService.rejectRecentOwnDuplicate = jest
      .fn()
      .mockRejectedValue(new Error('You already submitted this same report recently.'));
    validationService.checkRateLimit = jest.fn();
    validationService.findDuplicate = jest.fn();
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
    ).rejects.toThrow('You already submitted this same report recently');

    expect(validationService.checkRateLimit).not.toHaveBeenCalled();
    expect(validationService.findDuplicate).not.toHaveBeenCalled();
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
    expect(serialized.duplicateMessage).toMatch(/similar report/i);
    expect(serialized.isPubliclyVisible).toBe(false);
    expect(serialized.canVote).toBe(false);
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
