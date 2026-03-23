import {Entity,PrimaryGeneratedColumn,Column,CreateDateColumn,UpdateDateColumn, ManyToOne,} from 'typeorm';
import { IncidentType } from '../enums/incident-type.enum';
import { IncidentSeverity } from '../enums/incident-severity.enum';
import { IncidentStatus } from '../enums/incident-status.enum';
import { Checkpoint } from '../../checkpoints/entities/checkpoint.entity';

@Entity('incidents')
export class Incident {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  title: string;

  @Column({ type: 'text' })
  description: string;

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
    default: IncidentStatus.OPEN,
  })
  status: IncidentStatus;

  @ManyToOne(() => Checkpoint, { nullable: true, onDelete: 'SET NULL' })
  checkpoint?: Checkpoint;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
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