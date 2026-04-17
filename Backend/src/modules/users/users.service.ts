import {
  BadRequestException,
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { PasswordService } from '../../core/services/password/password.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserQueryDto } from './dto/user-query.dto';
import { AlertsService } from '../alerts/alerts.service';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';

type SocialUserSeed = {
  firstname: string;
  lastname: string;
  email: string;
  provider: string;
  providerId?: string;
  profileImage?: string | null;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,

    private passwordService: PasswordService,
    private readonly alertsService: AlertsService,
  ) {}

  /**
   * Create a new user with hashed password
   * Checks for duplicate email before creating
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const { password, role, ...rest } = createUserDto;
    const normalizedEmail = this.normalizeEmail(rest.email);

    const existingUser = await this.usersRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      if (existingUser.passwordHash) {
        const samePassword = await this.passwordService.compare(
          password,
          existingUser.passwordHash,
        );

        if (samePassword) {
          return existingUser;
        }
      }

      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await this.passwordService.hash(password);
    const user = this.usersRepository.create({
      ...rest,
      email: normalizedEmail,
      passwordHash: hashedPassword,
      role: role ?? UserRole.CITIZEN,
    });
    return this.usersRepository.save(user);
  }

  async createGoogleUser(data: {
    firstname: string;
    lastname: string;
    email: string;
    googleId: string;
    profileImage?: string | null;
  }): Promise<User> {
    return this.createSocialUser({
      firstname: data.firstname,
      lastname: data.lastname,
      email: data.email,
      provider: 'google',
      providerId: data.googleId,
      profileImage: data.profileImage,
    });
  }

  async createLinkedinUser(data: {
    firstname: string;
    lastname: string;
    email: string;
    linkedinId: string;
    profileImage?: string | null;
  }): Promise<User> {
    return this.createSocialUser({
      firstname: data.firstname,
      lastname: data.lastname,
      email: data.email,
      provider: 'linkedin',
      providerId: data.linkedinId,
      profileImage: data.profileImage,
    });
  }

  async createSocialUser(data: SocialUserSeed): Promise<User> {
    const normalizedEmail = this.normalizeEmail(data.email);
    const user = await this.usersRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (user) {
      return user;
    }

    const providerName = data.provider.trim().toLowerCase();
    const providerId = data.providerId?.trim() || undefined;
    const providerImage = this.normalizeNullableString(data.profileImage);
    const newUser = this.usersRepository.create({
      firstname: data.firstname.trim(),
      lastname: data.lastname.trim(),
      email: normalizedEmail,
      passwordHash: null,
      role: UserRole.CITIZEN,
      googleId: providerName === 'google' ? providerId : undefined,
      linkedinId: providerName === 'linkedin' ? providerId : undefined,
      provider: providerName,
      profileImage: providerImage ?? null,
      profileImageUpdatedAt: providerImage ? new Date() : undefined,
      isVerified: true,
    });

    return this.usersRepository.save(newUser);
  }

  async resolveSocialLoginUser(data: SocialUserSeed): Promise<User> {
    const normalizedEmail = this.normalizeEmail(data.email);
    const providerName = data.provider.trim().toLowerCase();
    const providerId = data.providerId?.trim() || undefined;
    const user = await this.usersRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return this.createSocialUser({
        firstname: data.firstname,
        lastname: data.lastname,
        email: normalizedEmail,
        provider: providerName,
        providerId,
        profileImage: data.profileImage,
      });
    }

    return user;
  }

  /**
   * Get all users
   */
  async findAll(userQueryDto: UserQueryDto = {}) {
    const { role, page = 1, limit = 10 } = userQueryDto;

    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find user by ID
   */
  async findOne(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findOneOrFail(id: number): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
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
    const user = await this.findOneOrFail(id);

    const { password, ...rest } = updateUserDto;

    if (rest.email) {
      const normalizedEmail = this.normalizeEmail(rest.email);
      if (normalizedEmail !== user.email) {
        await this.ensureEmailUnique(normalizedEmail);
        rest.email = normalizedEmail;
      }
    }

    if (password) {
      user.passwordHash = await this.passwordService.hash(password);
    }

    Object.assign(user, rest);
    return this.usersRepository.save(user);
  }

  async updateCurrentUser(
    id: number,
    updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    const user = await this.findOneOrFail(id);
    const firstname =
      updateProfileDto.firstname !== undefined
        ? updateProfileDto.firstname.trim()
        : user.firstname;
    const lastname =
      updateProfileDto.lastname !== undefined
        ? updateProfileDto.lastname.trim()
        : user.lastname;

    if (!firstname && !lastname) {
      throw new BadRequestException('A profile name is required');
    }

    const requestedPasswordChange =
      updateProfileDto.newPassword !== undefined;

    if (requestedPasswordChange) {
      if (!updateProfileDto.currentPassword || !updateProfileDto.newPassword) {
        throw new BadRequestException(
          'Current password and new password are both required to change password',
        );
      }

      if (!user.passwordHash) {
        throw new BadRequestException(
          'Password changes are unavailable for accounts without a local password',
        );
      }

      const isCurrentPasswordValid = await this.passwordService.compare(
        updateProfileDto.currentPassword,
        user.passwordHash,
      );

      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      user.passwordHash = await this.passwordService.hash(
        updateProfileDto.newPassword,
      );
    }

    user.firstname = firstname;
    user.lastname = lastname;

    if (updateProfileDto.phone !== undefined) {
      user.phone = this.normalizeNullableString(updateProfileDto.phone);
    }

    if (updateProfileDto.address !== undefined) {
      user.address = this.normalizeNullableString(updateProfileDto.address);
    }

    if (updateProfileDto.language !== undefined) {
      user.language = updateProfileDto.language;
    }

    if (updateProfileDto.profileImage !== undefined) {
      user.profileImage = this.normalizeNullableString(
        updateProfileDto.profileImage,
      ) || updateProfileDto.profileImage || null;
      // Record when the profile image was last updated
      if (user.profileImage) {
        user.profileImageUpdatedAt = new Date();
      }
      // profileImage is maintained as-is (Base64 or provider URL)
      // Only modified through explicit Profile page updates
    }

    const savedUser = await this.usersRepository.save(user);
    return this.findOneOrFail(savedUser.id);
  }

  /**
   * Delete a user
   */
  async remove(id: number): Promise<void> {
    await this.usersRepository.delete(id);
  }

  /**
   * Normalize email to lowercase and trim
   */
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizeNullableString(
    value?: string | null,
  ): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue ? normalizedValue : null;
  }

  /**
   * Check if email already exists, throw error if it does
   */
  private async ensureEmailUnique(email: string): Promise<void> {
    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }
  }

  async countCitizens(): Promise<number> {
    return this.usersRepository.count({
      where: { role: UserRole.CITIZEN },
    });
  }

  async getCitizensRegistrationTrend(days = 7): Promise<{
    percentageChange: number;
    currentPeriodCount: number;
    previousPeriodCount: number;
    periodDays: number;
  }> {
    const periodDays = Number.isInteger(days) && days > 0 ? days : 7;
    const now = new Date();
    const currentPeriodStart = new Date(
      now.getTime() - periodDays * 24 * 60 * 60 * 1000,
    );
    const previousPeriodStart = new Date(
      currentPeriodStart.getTime() - periodDays * 24 * 60 * 60 * 1000,
    );

    const [currentPeriodCount, previousPeriodCount] = await Promise.all([
      this.countCitizensRegisteredBetween(currentPeriodStart, now),
      this.countCitizensRegisteredBetween(
        previousPeriodStart,
        currentPeriodStart,
      ),
    ]);

    return {
      percentageChange: this.calculatePercentageChange(
        previousPeriodCount,
        currentPeriodCount,
      ),
      currentPeriodCount,
      previousPeriodCount,
      periodDays,
    };
  }

  async getCitizenRegistrationBuckets(months = 6): Promise<{
    periodMonths: number;
    buckets: { label: string; value: number }[];
  }> {
    const periodMonths = Number.isInteger(months) && months > 0 ? months : 6;
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const startMonth = new Date(currentMonth);
    startMonth.setMonth(startMonth.getMonth() - (periodMonths - 1));

    const formatMonthKey = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    };

    const formatMonthLabel = (date: Date) =>
      date.toLocaleDateString('en-US', {
        month: 'short',
      });

    const rawCounts = await this.usersRepository
      .createQueryBuilder('user')
      .select("DATE_FORMAT(user.createdAt, '%Y-%m')", 'bucketMonth')
      .addSelect('COUNT(*)', 'count')
      .where('user.role = :role', { role: UserRole.CITIZEN })
      .andWhere('user.createdAt >= :startMonth', { startMonth })
      .groupBy("DATE_FORMAT(user.createdAt, '%Y-%m')")
      .orderBy("DATE_FORMAT(user.createdAt, '%Y-%m')", 'ASC')
      .getRawMany<{ bucketMonth: string; count: string }>();

    const countsByMonth = new Map(
      rawCounts.map((row) => [row.bucketMonth, Number(row.count) || 0]),
    );

    const buckets: { label: string; value: number }[] = [];

    for (let offset = 0; offset < periodMonths; offset += 1) {
      const bucketDate = new Date(startMonth);
      bucketDate.setMonth(bucketDate.getMonth() + offset);
      const bucketKey = formatMonthKey(bucketDate);

      buckets.push({
        label: formatMonthLabel(bucketDate),
        value: countsByMonth.get(bucketKey) ?? 0,
      });
    }

    return {
      periodMonths,
      buckets,
    };
  }

  private async countCitizensRegisteredBetween(
    start: Date,
    end: Date,
  ): Promise<number> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.CITIZEN })
      .andWhere('user.createdAt >= :start', { start })
      .andWhere('user.createdAt < :end', { end })
      .getCount();
  }

  private calculatePercentageChange(
    oldValue: number,
    newValue: number,
  ): number {
    if (oldValue === 0) {
      return newValue === 0 ? 0 : 100;
    }

    const change = ((newValue - oldValue) / oldValue) * 100;
    return Number(change.toFixed(2));
  }

  async findAllCitizens(userQueryDto: UserQueryDto) {
    userQueryDto.role = UserRole.CITIZEN;

    const result = await this.findAll(userQueryDto);

    return {
      data: result.data,
      meta: result.meta,
    };
  }
}
