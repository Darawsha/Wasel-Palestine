import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckpointsController } from './checkpoints.controller';
import { CheckpointsService } from './checkpoints.service';
import { Checkpoint } from './entities/checkpoint.entity';
import { CheckpointStatusHistory } from './entities/status-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Checkpoint, CheckpointStatusHistory]),
  ],
  controllers: [CheckpointsController],
  providers: [CheckpointsService],
})
export class CheckpointsModule {}