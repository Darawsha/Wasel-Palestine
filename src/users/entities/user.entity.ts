import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, length: 50 })
  firstname: string;

  @Column({ nullable: false, length: 50 })
  lastname: string;

  @Index('IDX_USER_EMAIL')
  @Column({ nullable: false, unique: true, length: 255 })
  email: string;

  @Exclude() // Prevents password from being returned in responses
  @Exclude() // Prevents password from being returned in responses
  @Column({ nullable: false })
  password: string;

  @Column({ default: 'citizen', length: 50 })
  role: string;

  @Column({ nullable: true, length: 15 })
  phone: string;

  @Column({ nullable: true, length: 200 })
  address: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
