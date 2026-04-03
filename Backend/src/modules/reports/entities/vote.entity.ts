import { 
  Column, 
  Entity, 
  ManyToOne, 
  PrimaryGeneratedColumn, 
  Unique, 
  JoinColumn 
} from 'typeorm';
import { VoteType } from '../enums/VoteType.enum';
import { Report } from './report.entity';
import { User } from '../../users/entities/user.entity';

@Entity('report_vote')
@Unique(['userId', 'reportId'])
export class ReportVote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  reportId: number;

  @Column({ type: 'enum', enum: VoteType })
  type: VoteType;

  @ManyToOne(() => Report, (report) => report.votes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reportId' })
  report: Report;

  
  @ManyToOne(() => User, (user) => user.votes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}