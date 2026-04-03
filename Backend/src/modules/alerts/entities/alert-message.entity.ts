import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { AlertRecord } from './alert-record.entity';

@Entity('alert_messages')
export class AlertMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'incident_id' })
  incidentId: string;

  @Column({ type: 'text', name: 'message_body' })
  messageBody: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => AlertRecord, record => record.message)
  records: AlertRecord[];
}