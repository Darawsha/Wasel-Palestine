import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { existsSync } from 'fs';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { createTypeOrmConfig } from './core/database/typeorm.config';
import { AuthMiddleware } from './core/middleware/authMiddleware';

import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CheckpointsModule } from './modules/checkpoints/checkpoints.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { MapModule } from './modules/map/map.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RouteModule } from './modules/route/route.module';
import { WeatherModule } from './modules/weather/weather.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { SystemSettingsModule } from './modules/system-settings/system-settings.module';

const projectRoot = process.cwd();
const workspaceRoot = existsSync(join(projectRoot, 'Frontend'))
  ? projectRoot
  : join(projectRoot, '..');
const envFilePath = Array.from(
  new Set([join(projectRoot, '.env'), join(workspaceRoot, '.env')]),
);

@Module({
  imports: [
    UsersModule,
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createTypeOrmConfig(configService),
    }),
    CheckpointsModule,
    IncidentsModule,
    MapModule,
    RouteModule,
    ReportsModule,
    AuditLogModule,
    WeatherModule,
    SystemSettingsModule,
    ServeStaticModule.forRoot({
      rootPath: join(workspaceRoot, 'Frontend'),
      exclude: ['/api*wildcard'],
    }),
    EventEmitterModule.forRoot(),
    AlertsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes('*');
  }
}
