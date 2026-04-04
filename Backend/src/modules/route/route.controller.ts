import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EstimateRouteDto } from './dto/estimate-route.dto';
import { RouteEstimateResponseDto } from './dto/route-estimate-response.dto';
import { RouteService } from './route.service';

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
  @ApiResponse({
    status: 201,
    description: 'Route estimation completed successfully',
    type: RouteEstimateResponseDto,
  })
  estimateRoute(
    @Body() estimateRouteDto: EstimateRouteDto,
  ): Promise<RouteEstimateResponseDto> {
    return this.routeService.estimateRoute(estimateRouteDto);
  }
}