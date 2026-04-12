import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ReportsService } from './src/modules/reports/services/reports.service';
import { ReportStatus } from './src/modules/reports/enums/report-status.enum';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const reportsService = app.get(ReportsService);

  // Probe counts
  const res = await reportsService.findAll({
    page: 1, limit: 10,
    statuses: [ReportStatus.PENDING, ReportStatus.UNDER_REVIEW],
    duplicateOnly: false
  });

  console.log("Total:", res.meta.total);
  console.log("Data:", res.data.length);
  console.log("Counts:", JSON.stringify(res.counts));
  
  await app.close();
}

bootstrap().catch(console.error);
