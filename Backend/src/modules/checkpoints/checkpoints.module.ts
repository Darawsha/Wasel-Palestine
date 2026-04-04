import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckpointsController } from './checkpoints.controller';
import { CheckpointsService } from './checkpoints.service';
import { Checkpoint } from './entities/checkpoint.entity';
import { CheckpointStatusHistory } from './entities/status-history.entity';
import { Incident } from '../incidents/entities/incident.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Checkpoint, CheckpointStatusHistory, Incident]),
  ],
  controllers: [CheckpointsController],
  providers: [CheckpointsService],
  exports: [CheckpointsService],
})
export class CheckpointsModule {}
