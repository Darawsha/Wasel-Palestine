import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authServiceMock = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    authServiceMock.getProfile.mockReturnValue({
      id: 12,
      firstname: 'Admin',
      lastname: 'User',
      email: 'admin@example.com',
      role: 'admin',
      phone: null,
      address: null,
      profileImage: null,
      provider: null,
      isVerified: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return a structured profile payload', () => {
    const result = controller.getProfile({
      user: {
        userId: 12,
        email: 'admin@example.com',
        role: 'admin',
      },
    });

    expect(authServiceMock.getProfile).toHaveBeenCalledWith(12);
    expect(result).toMatchObject({
      id: 12,
      firstname: 'Admin',
      lastname: 'User',
      email: 'admin@example.com',
      role: 'admin',
      profileImage: null,
    });
  });
});
