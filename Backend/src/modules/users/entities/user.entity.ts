import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ReportVote } from '../../reports/entities/vote.entity';
import { PrimaryLanguage } from '../../system-settings/enums/primary-language.enum';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, length: 50 })
  firstname: string;

  @Column({ nullable: false, length: 50 })
  lastname: string;

  @Index({ unique: true })
  @Column({ length: 255, nullable: false })
  email: string;

  @Exclude()
 @Column({ name: 'password_hash', nullable: true })
passwordHash: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CITIZEN,
  })
  role: UserRole;

  @Column({ nullable: true, length: 15 })
  phone?: string;

  @Column({ nullable: true, length: 200 })
  address?: string;

  @Column({
    type: 'enum',
    enum: PrimaryLanguage,
    default: PrimaryLanguage.ENGLISH,
  })
  language: PrimaryLanguage;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ReportVote, (vote) => vote.user)
  votes: ReportVote[];

@Column({ nullable: true })
googleId?: string;

@Column({ nullable: true })
linkedinId?: string;

@Column({ nullable: true })
provider?: string;

@Column({ type: 'longtext', nullable: true })
profileImage?: string;

@Column({ nullable: true })
profileImageUpdatedAt?: Date;

@Column({ default: false })
isVerified: boolean;

@Column({ type: 'timestamp', nullable: true })
lastAlertsViewedAt?: Date | null;
}
