import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Report } from '../entities/report.entity';
import { ReportCategory } from '../enums/report-category.enum';
import { ReportValidationService } from './report-validation.service';

describe('ReportValidationService', () => {
  let service: ReportValidationService;
  let queryBuilder: {
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    getMany: jest.Mock;
  };

  function setDuplicateCandidates(candidates: Partial<Report>[]) {
    queryBuilder.getMany.mockResolvedValue(candidates);
  }

  beforeEach(async () => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportValidationService,
        {
          provide: getRepositoryToken(Report),
          useValue: {
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => queryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<ReportValidationService>(ReportValidationService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses an exact 30-minute recent duplicate window', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-18T10:30:00.000Z'));

    await service.findDuplicate({
      category: ReportCategory.ROAD_CLOSURE,
      location: 'Awarta checkpoint',
      description: 'Awarta checkpoint is closed.',
      latitude: 32.161,
      longitude: 35.286,
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'report.createdAt >= :timeWindow',
      {
        timeWindow: new Date('2026-04-18T10:00:00.000Z'),
      },
    );
  });

  it('blocks the same user from submitting the same report within 15 minutes', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-18T10:30:00.000Z'));
    setDuplicateCandidates([
      {
        reportId: 20,
        submittedByUserId: 7,
        category: ReportCategory.ROAD_CLOSURE,
        description: 'Awarta checkpoint is closed.',
      } as Report,
    ]);

    await expect(
      service.rejectRecentOwnDuplicate({
        submittedByUserId: 7,
        category: ReportCategory.ROAD_CLOSURE,
        location: 'Awarta checkpoint',
        description: 'Awarta checkpoint is closed.',
        latitude: 32.161,
        longitude: 35.286,
      }),
    ).rejects.toThrow('You already submitted this same report recently');

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'report.createdAt >= :timeWindow',
      {
        timeWindow: new Date('2026-04-18T10:15:00.000Z'),
      },
    );
  });

  it('allows the same user to submit a different checkpoint state at the same location', async () => {
    setDuplicateCandidates([
      {
        reportId: 21,
        submittedByUserId: 7,
        category: ReportCategory.CHECKPOINT_ISSUE,
        description: 'Awarta checkpoint is closed.',
      } as Report,
    ]);

    await expect(
      service.rejectRecentOwnDuplicate({
        submittedByUserId: 7,
        category: ReportCategory.CHECKPOINT_ISSUE,
        location: 'Awarta checkpoint',
        description: 'Awarta checkpoint has a long delay.',
        latitude: 32.161,
        longitude: 35.286,
      }),
    ).resolves.toBeUndefined();
  });

  it('returns a recent nearby report with the same category and meaning', async () => {
    const candidate = {
      reportId: 10,
      category: ReportCategory.ROAD_CLOSURE,
      description: 'Awarta checkpoint is closed.',
    } as Report;
    setDuplicateCandidates([candidate]);

    const duplicate = await service.findDuplicate({
      category: ReportCategory.ROAD_CLOSURE,
      location: 'Awarta checkpoint',
      description: 'The checkpoint is closed and traffic is blocked.',
      latitude: 32.161,
      longitude: 35.286,
    });

    expect(duplicate).toBe(candidate);
  });

  it('does not treat same-location checkpoint reports with different states as duplicates', async () => {
    setDuplicateCandidates([
      {
        reportId: 11,
        category: ReportCategory.CHECKPOINT_ISSUE,
        description: 'Awarta checkpoint has a long delay.',
      } as Report,
    ]);

    const duplicate = await service.findDuplicate({
      category: ReportCategory.CHECKPOINT_ISSUE,
      location: 'Awarta checkpoint',
      description: 'Awarta checkpoint is closed.',
      latitude: 32.161,
      longitude: 35.286,
    });

    expect(duplicate).toBeNull();
  });

  it('does not treat same-location reports with different categories as duplicates', async () => {
    setDuplicateCandidates([]);

    await service.findDuplicate({
      category: ReportCategory.ACCIDENT,
      location: 'Route 60',
      description: 'Accident near the junction.',
      latitude: 32.1,
      longitude: 35.2,
    });

    expect(queryBuilder.where).toHaveBeenCalledWith('report.category = :category', {
      category: ReportCategory.ACCIDENT,
    });
  });
});
