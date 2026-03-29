import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Incident } from './incident.entity';
import { IncidentStatus } from '../enums/incident-status.enum';

@Entity('incident_status_history')
export class IncidentStatusHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Incident, (incident) => incident.statusHistory, {
    onDelete: 'CASCADE',
  })
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

  @CreateDateColumn({ type: 'timestamp' })
  changedAt: Date;
}
