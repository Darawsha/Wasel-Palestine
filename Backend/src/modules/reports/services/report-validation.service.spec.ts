import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { MoreThan } from 'typeorm';
import { Report } from '../entities/report.entity';
import { ReportValidationService } from './report-validation.service';

describe('ReportValidationService', () => {
  let service: ReportValidationService;
  let reportRepo: {
    count: jest.Mock;
  };

  beforeEach(async () => {
    reportRepo = {
      count: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportValidationService,
        {
          provide: getRepositoryToken(Report),
          useValue: reportRepo,
        },
      ],
    }).compile();

    service = module.get<ReportValidationService>(ReportValidationService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows report submission below the rate limit', async () => {
    reportRepo.count.mockResolvedValue(2);

    await expect(service.checkRateLimit(7)).resolves.toBeUndefined();
  });

  it('blocks more than 3 reports within 5 minutes for the same user', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-18T10:30:00.000Z'));
    reportRepo.count.mockResolvedValue(3);

    await expect(service.checkRateLimit(7)).rejects.toThrow(
      'Rate limit exceeded',
    );

    expect(reportRepo.count).toHaveBeenCalledWith({
      where: {
        submittedByUserId: 7,
        createdAt: MoreThan(new Date('2026-04-18T10:25:00.000Z')),
      },
    });
  });
});
