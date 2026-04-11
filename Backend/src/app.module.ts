import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CheckpointsModule } from './modules/checkpoints/checkpoints.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { AuthMiddleware } from './core/middleware/authMiddleware';
import { typeOrmConfig } from './core/database/typeorm.config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AlertsModule } from './modules/alerts/alerts.module';
import { MapModule } from './modules/map/map.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RouteModule } from './modules/route/route.module';
import { WeatherModule } from './modules/weather/weather.module';
const projectRoot = process.cwd();
@Module({
  imports: [
    UsersModule,
    AuthModule,
        ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(typeOrmConfig),
    CheckpointsModule,
    IncidentsModule,
    MapModule,
    RouteModule,
    ReportsModule,
    WeatherModule,
    ServeStaticModule.forRoot({
      rootPath: join(projectRoot, 'Frontend'),
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


