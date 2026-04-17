import { Module } from '@nestjs/common';
import { ReportsService } from './services/reports.service';
import { ReportCredibilityService } from './services/report-credibility.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './entities/report.entity';
import { ReportModerationAudit } from './entities/report-moderation-audit.entity';
import { ReportConfirmation } from './entities/report-confirmation.entity';
import { ReportVote } from './entities/vote.entity';
import { User } from '../users/entities/user.entity';
import { ReportsController } from './controllers/reports.controller';
import { ReportInteractionsController } from './controllers/report-interactions.controller';
import { ReportModerationController } from './controllers/report-moderation.controller';
import { ReportModerationService } from './services/report-moderation.service';
import { ReportValidationService } from './services/report-validation.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    AuditLogModule,
    TypeOrmModule.forFeature([
      Report,
      ReportModerationAudit,
      ReportConfirmation,
      ReportVote,
      User,
    ]),
  ],
  controllers: [
    ReportsController,
    ReportInteractionsController,
    ReportModerationController,
  ],
  providers: [
    ReportsService,
    ReportCredibilityService,
    ReportModerationService,
    ReportValidationService,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
