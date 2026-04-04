import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
  OneToMany,
  RelationId,
  Unique,
} from 'typeorm';
import { IncidentType } from '../enums/incident-type.enum';
import { IncidentSeverity } from '../enums/incident-severity.enum';
import { IncidentStatus } from '../enums/incident-status.enum';
import { Checkpoint } from '../../checkpoints/entities/checkpoint.entity';
import { IncidentStatusHistory } from './status-history.entity';
import { CheckpointStatus } from '../../checkpoints/enums/checkpoint-status.enum';

@Entity('incidents')
export class Incident {
  @Unique(['title', 'latitude', 'longitude'])
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ length: 150 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ type: 'text', nullable: true })
  location?: string;

  @Column({
    type: 'enum',
    enum: IncidentType,
  })
  type: IncidentType;

  @Column({
    type: 'enum',
    enum: IncidentSeverity,
  })
  severity: IncidentSeverity;

  @Column({
    type: 'enum',
    enum: IncidentStatus,
    default: IncidentStatus.ACTIVE,
  })
  status: IncidentStatus;

  @Column({
    type: 'enum',
    enum: CheckpointStatus,
    nullable: true,
  })
  impactStatus?: CheckpointStatus | null;

  @ManyToOne(() => Checkpoint, (checkpoint) => checkpoint.incidents, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'checkpointId' })
  checkpoint?: Checkpoint;

  @RelationId((incident: Incident) => incident.checkpoint)
  checkpointId?: number | null;

  @OneToMany(
    () => IncidentStatusHistory,
    (statusHistory) => statusHistory.incident,
  )
  statusHistory: IncidentStatusHistory[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @Column({ type: 'int', nullable: true })
  verifiedByUserId?: number;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @Column({ type: 'int', nullable: true })
  closedByUserId?: number;

  @Column({ type: 'timestamp', nullable: true })
  closedAt?: Date;
}
