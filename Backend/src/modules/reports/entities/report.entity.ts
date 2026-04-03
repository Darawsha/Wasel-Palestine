import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import {
  IsEnum,
  IsNumber,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { ReportCategory } from '../enums/report-category.enum';
import { ReportStatus } from '../enums/report-status.enum';
import { ReportVote } from './vote.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Report {
  @PrimaryGeneratedColumn()
  reportId: number;

  @Column('float')
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @Column('float')
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @Column()
  @IsString()
  @MinLength(10)
  location: string;

  @Column({
    type: 'enum',
    enum: ReportCategory,
  })
  @IsEnum(ReportCategory)
  category: ReportCategory;

  @Column('text')
  @IsString()
  @MinLength(10)
  description: string;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @Column()
  @IsNumber()
  submittedByUserId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'submittedByUserId' })
  submittedByUser: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  @IsNumber()
  duplicateOf?: number;

  @Column({ default: 0 })
  @IsNumber()
  confidenceScore: number;

  @OneToMany(() => ReportVote, (vote) => vote.report)
  votes: ReportVote[];
}
