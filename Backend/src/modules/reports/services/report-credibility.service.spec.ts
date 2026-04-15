import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportConfirmation } from '../entities/report-confirmation.entity';
import { Report } from '../entities/report.entity';
import { ReportVote } from '../entities/vote.entity';
import { ReportCredibilityService } from './report-credibility.service';

describe('ReportCredibilityService', () => {
  let service: ReportCredibilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportCredibilityService,
        {
          provide: getRepositoryToken(ReportVote),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ReportConfirmation),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Report),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ReportCredibilityService>(ReportCredibilityService);
  });

  it('calculates 0 confidence when there are no votes', () => {
    expect(service.calculateScore(0, 0)).toBe(0);
  });

  it('calculates 100 confidence for all-up votes', () => {
    expect(service.calculateScore(10, 0)).toBe(100);
  });

  it('calculates 80 confidence for 8 up and 2 down votes', () => {
    expect(service.calculateScore(8, 2)).toBe(80);
  });

  it('calculates 50 confidence for equal up and down votes', () => {
    expect(service.calculateScore(5, 5)).toBe(50);
  });

  it('calculates 20 confidence for 2 up and 8 down votes', () => {
    expect(service.calculateScore(2, 8)).toBe(20);
  });
});
