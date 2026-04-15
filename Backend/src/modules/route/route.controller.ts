import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { EstimateRouteDto } from './dto/estimate-route.dto';
import { RouteEstimateResponseDto } from './dto/route-estimate-response.dto';
import { RouteService } from './route.service';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../common/dto/error-response.dto';

@ApiTags('Routes')
@Controller('routes')
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Post('estimate')
  @ApiOperation({
    summary: 'Estimate a route between two locations',
    description:
      'Returns an estimated route distance, estimated duration, and explanatory metadata based on heuristic calculations and optional constraints.',
  })
  @ApiBody({ type: EstimateRouteDto })
  @ApiCreatedResponse({
    description: 'Route estimation completed successfully',
    type: RouteEstimateResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid route estimation payload',
    type: ValidationErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  estimateRoute(
    @Body() estimateRouteDto: EstimateRouteDto,
  ): Promise<RouteEstimateResponseDto> {
    return this.routeService.estimateRoute(estimateRouteDto);
  }
}