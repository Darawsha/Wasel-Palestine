import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { CheckpointStatus } from '../enums/checkpoint-status.enum';
import { CheckpointStatusHistory } from './status-history.entity';
import { Incident } from '../../incidents/entities/incident.entity';
import { ModerationStatus } from '../../../common/enums/moderation-status.enum';

const decimalColumnTransformer = {
  to: (value: number | null | undefined): number | null | undefined => value,
  from: (value: string | number | null): number | null =>
    value === null ? null : Number(value),
};
/**
 * Represents a checkpoint entity stored in the database.
 *
 * This entity is used to store information about geographical checkpoints
 * including their name, location (latitude & longitude), status, and metadata.
 */
@Entity('checkpoint')
@Unique(['name'])
export class Checkpoint {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;
  /**
   * Latitude coordinate of the checkpoint location.
   * Stored as a decimal with precision (10,7).
   */
  @Column('decimal', {
    precision: 10,
    scale: 7,
    transformer: decimalColumnTransformer,
  })
  latitude: number;
  /**
   * Longitude coordinate of the checkpoint location.
   * Stored as a decimal with precision (10,7).
   */

  @Column({ type: 'text', nullable: false })
  location: string;

  @Column('decimal', {
    precision: 10,
    scale: 7,
    transformer: decimalColumnTransformer,
  })
  longitude: number;
  /**
   * Optional description providing additional details about the checkpoint.
   */
  @Column({ type: 'text', nullable: true })
  description?: string;
  /**
   * Current status of the checkpoint.
   * Defaults to OPEN.
   */

  @Column({ type: 'enum', enum: CheckpointStatus, default: CheckpointStatus.OPEN })
  currentStatus: CheckpointStatus;

  @Column({
    type: 'enum',
    enum: ModerationStatus,
    default: ModerationStatus.APPROVED,
  })
  moderationStatus: ModerationStatus;

  @Column({ type: 'simple-json', nullable: true })
  pendingChanges?: Record<string, unknown> | null;

  @Column({ type: 'int', nullable: true })
  createdByUserId?: number | null;

  @Column({ type: 'int', nullable: true })
  updatedByUserId?: number | null;

  @Column({ type: 'int', nullable: true })
  approvedByUserId?: number | null;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date | null;

  @Column({ type: 'int', nullable: true })
  rejectedByUserId?: number | null;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string | null;

  /**
   * Timestamp when the checkpoint was created.
   * Automatically generated.
   */

  @OneToMany(
    () => CheckpointStatusHistory,
    (statusHistory) => statusHistory.checkpoint,
  )
  statusHistory: CheckpointStatusHistory[];

  @CreateDateColumn()
  createdAt: Date;

  /**
   * Timestamp when the checkpoint was last updated.
   * Automatically updated on changes.
   */
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Incident, (incident) => incident.checkpoint)
  incidents: Incident[];
}
