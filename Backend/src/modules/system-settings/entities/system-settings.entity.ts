import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PrimaryLanguage } from '../enums/primary-language.enum';

@Entity('system_settings')
export class SystemSettings {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ length: 150 })
  platformName: string;

  @Column({
    type: 'enum',
    enum: PrimaryLanguage,
    default: PrimaryLanguage.ENGLISH,
  })
  primaryLanguage: PrimaryLanguage;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
