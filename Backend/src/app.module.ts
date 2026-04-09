import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './core/database/typeorm.config';
import { AuthMiddleware } from './core/middleware/authMiddleware';
import { AlertsModule } from './modules/alerts/alerts.module';
import { CheckpointsModule } from './modules/checkpoints/checkpoints.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { MapModule } from './modules/map/map.module';

import { ReportsModule } from './modules/reports/reports.module';
import { RouteModule } from './modules/route/route.module';
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
    ReportsModule,
    MapModule,
    RouteModule,

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
    consumer.apply(AuthMiddleware).forRoutes('*'); // Match all routes in the Nest app under the 'api' prefix
  }
}
