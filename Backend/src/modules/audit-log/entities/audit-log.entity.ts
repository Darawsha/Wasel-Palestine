import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AuditAction } from '../enums/audit-action.enum';
import { AuditTargetType } from '../enums/audit-target-type.enum';

@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({
    type: 'enum',
    enum: AuditTargetType,
  })
  targetType: AuditTargetType;

  @Column()
  targetId: number;

  @Column({ type: 'int', nullable: true })
  performedByUserId?: number | null;

  @Column({ type: 'text' })
  details: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'performedByUserId' })
  performedBy?: User | null;
}
