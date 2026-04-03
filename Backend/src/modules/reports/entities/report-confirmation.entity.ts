import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Report } from './report.entity';
import { User } from '../../users/entities/user.entity';

@Entity('report_confirmation')
@Unique(['reportId', 'userId'])
export class ReportConfirmation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  reportId: number;

  @Column()
  userId: number;

  @ManyToOne(() => Report, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reportId' })
  report: Report;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
