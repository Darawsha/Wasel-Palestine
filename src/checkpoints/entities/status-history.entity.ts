import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Checkpoint } from './checkpoint.entity';
import { CheckpointStatus } from '../enums/checkpoint-status.enum';

@Entity('checkpoint_status_history')
export class CheckpointStatusHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Checkpoint, (checkpoint) => checkpoint.statusHistory, {
    onDelete: 'CASCADE',
  })
  checkpoint: Checkpoint;

  @Column({
    type: 'enum',
    enum: CheckpointStatus,
  })
  oldStatus: CheckpointStatus;

  @Column({
    type: 'enum',
    enum: CheckpointStatus,
  })
  newStatus: CheckpointStatus;

  @CreateDateColumn()
  changedAt: Date;
}