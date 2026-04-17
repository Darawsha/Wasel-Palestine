import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesModule } from '../../core/services/services.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ServicesModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

