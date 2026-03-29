import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authServiceMock = {};

  beforeEach(async () => {
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

    expect(result).toEqual({
      id: 12,
      email: 'admin@example.com',
      role: 'admin',
    });
  });
});
