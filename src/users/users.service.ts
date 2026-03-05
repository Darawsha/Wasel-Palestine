import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { PasswordService } from '../services/password/password.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private passwordService: PasswordService
  ) {}

  /**
   * Create a new user with hashed password
   * Checks for duplicate email before creating
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const normalizedEmail = this.normalizeEmail(createUserDto.email);
    
    await this.ensureEmailUnique(normalizedEmail);
    
    const hashedPassword = await this.passwordService.hash(createUserDto.password);
    const user = this.usersRepository.create({
      ...createUserDto,
      email: normalizedEmail,
      password: hashedPassword,
    });
    
    return this.usersRepository.save(user);
  }

  /**
   * Get all users
   */
  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  /**
   * Find user by ID
   */
  async findOne(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  /**
   * Find user by email (normalized)
   */
  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = this.normalizeEmail(email);
    return this.usersRepository.findOne({ where: { email: normalizedEmail } });
  }

  /**
   * Update user information
   */
  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (updateUserDto.email) {
      const normalizedEmail = this.normalizeEmail(updateUserDto.email);
      if (normalizedEmail !== user.email) {
        await this.ensureEmailUnique(normalizedEmail);
        updateUserDto.email = normalizedEmail;
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await this.passwordService.hash(updateUserDto.password);
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  /**
   * Delete a user
   */
  async remove(id: number): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  /**
   * Normalize email to lowercase and trim
   */
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Check if email already exists, throw error if it does
   */
  private async ensureEmailUnique(email: string): Promise<void> {
    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }
  }
}
