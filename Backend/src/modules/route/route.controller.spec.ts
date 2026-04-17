import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RouteController } from './route.controller';
import { EstimateRouteDto } from './dto/estimate-route.dto';
import { RouteService } from './route.service';

describe('RouteController', () => {
  let controller: RouteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RouteController],
      providers: [
        {
          provide: RouteService,
          useValue: {
            estimateRoute: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RouteController>(RouteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('parses string boolean avoidance flags without flipping "false" to true', () => {
    const dto = plainToInstance(EstimateRouteDto, {
      startLatitude: 32.2211,
      startLongitude: 35.2544,
      endLatitude: 31.7683,
      endLongitude: 35.2137,
      avoidCheckpoints: 'false',
      avoidIncidents: 'true',
    });

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.avoidCheckpoints).toBe(false);
    expect(dto.avoidIncidents).toBe(true);
  });

  it('keeps invalid string boolean avoidance flags invalid for validation', () => {
    const dto = plainToInstance(EstimateRouteDto, {
      startLatitude: 32.2211,
      startLongitude: 35.2544,
      endLatitude: 31.7683,
      endLongitude: 35.2137,
      avoidCheckpoints: 'not-a-boolean',
    });

    const errors = validateSync(dto);

    expect(errors.some((error) => error.property === 'avoidCheckpoints')).toBe(
      true,
    );
  });
});
