import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { IncidentType } from '../enums/incident-type.enum';
import { IncidentSeverity } from '../enums/incident-severity.enum';
import { IncidentStatus } from '../enums/incident-status.enum';
import { Checkpoint } from '../../checkpoints/entities/checkpoint.entity';
import { IncidentStatusHistory } from './status-history.entity';

@Entity('incidents')
export class Incident {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  title: string;

  @Column({ type: 'text' })
  description: string;

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

  @ManyToOne(() => Checkpoint, { nullable: true, onDelete: 'SET NULL' })
  checkpoint?: Checkpoint;

  @OneToMany(() => IncidentStatusHistory, (statusHistory) => statusHistory.incident)
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
