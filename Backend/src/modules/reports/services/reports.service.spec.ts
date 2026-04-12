import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Report } from '../entities/report.entity';
import { ReportConfirmation } from '../entities/report-confirmation.entity';
import { ReportVote } from '../entities/vote.entity';
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
});
