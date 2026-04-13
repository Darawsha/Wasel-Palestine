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

  @Column({ length: 150, nullable: true })
  title?: string | null;

  @Column({ type: 'text', nullable: true })
  summary?: string | null;

  @Column({ name: 'sender_name', length: 150, nullable: true })
  senderName?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => AlertRecord, record => record.message)
  records: AlertRecord[];
}
