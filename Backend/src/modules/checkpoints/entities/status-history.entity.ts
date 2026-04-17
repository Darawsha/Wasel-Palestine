import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Checkpoint } from './checkpoint.entity';
import { CheckpointStatus } from '../enums/checkpoint-status.enum';
import { User } from '../../users/entities/user.entity';

@Entity('checkpoint_status_history')
export class CheckpointStatusHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  checkpointId: number;

  @ManyToOne(() => Checkpoint, (checkpoint) => checkpoint.statusHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'checkpointId' })
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

  @Column({ type: 'int', nullable: true })
  changedByUserId?: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changedByUserId' })
  changedByUser?: User;

  @CreateDateColumn()
  changedAt: Date;
}
