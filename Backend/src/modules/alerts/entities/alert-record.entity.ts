import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AlertMessage } from './alert-message.entity';

@Entity('alert_records')
export class AlertRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ default: 'PENDING' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => AlertMessage, (message) => message.records, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'message_id' })
  message: AlertMessage;
}
