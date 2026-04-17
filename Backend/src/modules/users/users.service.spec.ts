import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { PasswordService } from '../../core/services/password/password.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';

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

  it('normalizes whitespace-only profileImage to null when updating the current user', async () => {
    const user = {
      id: 7,
      firstname: 'Lina',
      lastname: 'Yousef',
      email: 'lina@example.com',
      profileImage: 'existing-image',
      profileImageUpdatedAt: null,
    } as User;
    const updateProfileDto = {
      profileImage: '   ',
    } as UpdateProfileDto;

    usersRepositoryMock.findOne.mockResolvedValue(user);
    usersRepositoryMock.save.mockImplementation(async (savedUser: User) => savedUser);

    const result = await service.updateCurrentUser(user.id, updateProfileDto);

    expect(usersRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        profileImage: null,
      }),
    );
    expect(result.profileImage).toBeNull();
  });
});
