import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Incident } from './incident.entity';
import { IncidentStatus } from '../enums/incident-status.enum';
import { User } from '../../users/entities/user.entity';

@Entity('incident_status_history')
export class IncidentStatusHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Incident, (incident) => incident.statusHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'incidentId' })
  incident: Incident;

  @Column({
    type: 'enum',
    enum: IncidentStatus,
  })
  oldStatus: IncidentStatus;

  @Column({
    type: 'enum',
    enum: IncidentStatus,
  })
  newStatus: IncidentStatus;

  @Column({ type: 'int', nullable: true })
  changedByUserId?: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changedByUserId' })
  changedByUser?: User;

  @CreateDateColumn({ type: 'timestamp' })
  changedAt: Date;
}
