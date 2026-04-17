import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { PasswordService } from '../../core/services/password/password.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { AlertsService } from '../alerts/alerts.service';
import { PrimaryLanguage } from '../system-settings/enums/primary-language.enum';

describe('UsersService', () => {
  let service: UsersService;

  const queryBuilderMock = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const usersRepositoryMock = {
    createQueryBuilder: jest.fn(() => queryBuilderMock),
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const passwordServiceMock = {
    hash: jest.fn(),
    compare: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepositoryMock,
        },
        {
          provide: PasswordService,
          useValue: passwordServiceMock,
        },
        {
          provide: AlertsService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return paginated users with meta information', async () => {
    const users = [
      {
        id: 1,
        firstname: 'Alaa',
        lastname: 'Khaled',
        email: 'alaa@example.com',
        role: UserRole.ADMIN,
      },
    ];

    queryBuilderMock.getManyAndCount.mockResolvedValue([users, 1]);

    const result = await service.findAll({
      role: UserRole.ADMIN,
      page: 2,
      limit: 5,
    });

    expect(usersRepositoryMock.createQueryBuilder).toHaveBeenCalledWith('user');
    expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
      'user.role = :role',
      { role: UserRole.ADMIN },
    );
    expect(queryBuilderMock.skip).toHaveBeenCalledWith(5);
    expect(queryBuilderMock.take).toHaveBeenCalledWith(5);
    expect(result).toEqual({
      data: users,
      meta: {
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1,
      },
    });
  });

  it('should seed a provider profile image only when creating a new social user', async () => {
    const createdUser = {
      id: 2,
      firstname: 'Google',
      lastname: 'Citizen',
      email: 'new.social@example.com',
      role: UserRole.CITIZEN,
      provider: 'google',
      googleId: 'google-123',
      profileImage: 'https://lh3.googleusercontent.com/avatar.png',
      isVerified: true,
    };

    usersRepositoryMock.findOne.mockResolvedValue(null);
    usersRepositoryMock.create.mockImplementation((value) => value);
    usersRepositoryMock.save.mockResolvedValue(createdUser);

    const result = await service.resolveSocialLoginUser({
      firstname: 'Google',
      lastname: 'Citizen',
      email: ' NEW.SOCIAL@example.com ',
      provider: 'google',
      providerId: 'google-123',
      profileImage: ' https://lh3.googleusercontent.com/avatar.png ',
    });

    expect(usersRepositoryMock.findOne).toHaveBeenCalledWith({
      where: { email: 'new.social@example.com' },
    });
    expect(usersRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        firstname: 'Google',
        lastname: 'Citizen',
        email: 'new.social@example.com',
        passwordHash: null,
        role: UserRole.CITIZEN,
        provider: 'google',
        googleId: 'google-123',
        profileImage: 'https://lh3.googleusercontent.com/avatar.png',
        isVerified: true,
      }),
    );
    expect(result).toBe(createdUser);
  });

  it('should not overwrite an existing local user during social login', async () => {
    const existingUser = {
      id: 3,
      firstname: 'Local',
      lastname: '',
      email: 'manual@example.com',
      role: UserRole.CITIZEN,
      phone: '+970599123456',
      address: 'Ramallah',
      provider: null,
      googleId: null,
      profileImage: 'data:image/png;base64,local',
      isVerified: false,
    };

    usersRepositoryMock.findOne.mockResolvedValue(existingUser);

    const result = await service.resolveSocialLoginUser({
      firstname: 'Provider',
      lastname: 'Name',
      email: 'MANUAL@example.com',
      provider: 'google',
      providerId: 'google-456',
      profileImage: 'https://lh3.googleusercontent.com/provider.png',
    });

    expect(result).toBe(existingUser);
    expect(usersRepositoryMock.save).not.toHaveBeenCalled();
    expect(existingUser).toMatchObject({
      firstname: 'Local',
      lastname: '',
      phone: '+970599123456',
      address: 'Ramallah',
      provider: null,
      googleId: null,
      profileImage: 'data:image/png;base64,local',
      isVerified: false,
    });
  });

  it('should persist editable profile fields for the current user', async () => {
    const existingUser = {
      id: 4,
      firstname: 'Old',
      lastname: 'Citizen',
      email: 'profile@example.com',
      role: UserRole.CITIZEN,
      phone: null,
      address: null,
      profileImage: null,
      passwordHash: 'hash',
    };

    usersRepositoryMock.findOne.mockResolvedValue(existingUser);
    usersRepositoryMock.save.mockImplementation((value) =>
      Promise.resolve(value),
    );

    const result = await service.updateCurrentUser(4, {
      firstname: 'New',
      lastname: 'Name',
      phone: '+970599999999',
      address: 'Nablus',
      profileImage: 'data:image/png;base64,new',
    });

    expect(usersRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        firstname: 'New',
        lastname: 'Name',
        phone: '+970599999999',
        address: 'Nablus',
        profileImage: 'data:image/png;base64,new',
      }),
    );
    expect(result.profileImageUpdatedAt).toBeInstanceOf(Date);
  });

  it('should persist the current user language preference', async () => {
    const existingUser = {
      id: 6,
      firstname: 'Language',
      lastname: 'Citizen',
      email: 'language@example.com',
      role: UserRole.CITIZEN,
      phone: null,
      address: null,
      language: PrimaryLanguage.ENGLISH,
      profileImage: null,
      passwordHash: 'hash',
    };

    usersRepositoryMock.findOne.mockResolvedValue(existingUser);
    usersRepositoryMock.save.mockImplementation((value) =>
      Promise.resolve(value),
    );

    const result = await service.updateCurrentUser(6, {
      firstname: 'Language',
      lastname: 'Citizen',
      language: PrimaryLanguage.ARABIC,
    });

    expect(usersRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        language: PrimaryLanguage.ARABIC,
      }),
    );
    expect(result.language).toBe(PrimaryLanguage.ARABIC);
  });

  it('should ignore a current password value when no new password is requested', async () => {
    const existingUser = {
      id: 5,
      firstname: 'Old',
      lastname: 'Citizen',
      email: 'autofill@example.com',
      role: UserRole.CITIZEN,
      phone: null,
      address: null,
      profileImage: null,
      passwordHash: 'hash',
    };

    usersRepositoryMock.findOne.mockResolvedValue(existingUser);
    usersRepositoryMock.save.mockImplementation((value) =>
      Promise.resolve(value),
    );

    const result = await service.updateCurrentUser(5, {
      firstname: 'Saved',
      lastname: 'Profile',
      phone: '+970593402543',
      currentPassword: 'autofilled-password',
    });

    expect(passwordServiceMock.compare).not.toHaveBeenCalled();
    expect(usersRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        firstname: 'Saved',
        lastname: 'Profile',
        phone: '+970593402543',
        passwordHash: 'hash',
      }),
    );
    expect(result).toMatchObject({
      firstname: 'Saved',
      lastname: 'Profile',
      phone: '+970593402543',
    });
  });
});
