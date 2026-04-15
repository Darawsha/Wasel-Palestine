import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Unique } from 'typeorm';
import { Exclude } from 'class-transformer';
import { CheckpointStatus } from '../enums/checkpoint-status.enum';
import { CheckpointStatusHistory } from './status-history.entity';
import { Incident } from '../../incidents/entities/incident.entity';

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

  @Column({ type: 'enum', enum: CheckpointStatus, default: CheckpointStatus.ACTIVE })
  currentStatus: CheckpointStatus;

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
