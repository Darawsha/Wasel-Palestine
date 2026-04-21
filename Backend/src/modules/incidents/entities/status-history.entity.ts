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
import { IncidentType } from '../enums/incident-type.enum';

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

  @Column({
    type: 'enum',
    enum: IncidentStatus,
    nullable: true,
  })
  statusAtTime?: IncidentStatus | null;

  @Column({
    type: 'enum',
    enum: IncidentType,
    nullable: true,
  })
  oldType?: IncidentType | null;

  @Column({
    type: 'enum',
    enum: IncidentType,
    nullable: true,
  })
  newType?: IncidentType | null;

  @Column({
    type: 'enum',
    enum: IncidentType,
    nullable: true,
  })
  typeAtTime?: IncidentType | null;

  @Column({ type: 'text', nullable: true })
  oldDescription?: string | null;

  @Column({ type: 'text', nullable: true })
  newDescription?: string | null;

  @Column({ type: 'int', nullable: true })
  changedByUserId?: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changedByUserId' })
  changedByUser?: User;

  @CreateDateColumn({ type: 'timestamp' })
  changedAt: Date;
}
