import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ReportModerationAction } from '../enums/report-moderation-action.enum';
import { Report } from './report.entity';
import { User } from '../../users/entities/user.entity';

@Entity('report_moderation_audit')
export class ReportModerationAudit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsInt()
  @Min(1)
  reportId: number;

  @Column()
  @IsInt()
  @Min(1)
  performedByUserId: number;

  @Column({
    type: 'enum',
    enum: ReportModerationAction,
  })
  @IsEnum(ReportModerationAction, {
    message: 'Invalid action. Please use an allowed moderation action.',
  })
  action: ReportModerationAction;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Report, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reportId' })
  report: Report;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'performedByUserId' })
  performedByUser: User;
}
