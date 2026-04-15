import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CurrentWeatherQueryDto } from './dto/current-weather-query.dto';
import { CurrentWeatherResponseDto } from './dto/current-weather-response.dto';
import { WeatherService } from './weather.service';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../common/dto/error-response.dto';

@ApiTags('Weather')
@ApiBearerAuth('token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'weather', version: '1' })
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('current')
  @ApiOperation({
    summary: 'Get live weather for a specific coordinate pair',
    description:
      'Fetches current weather conditions for the requested latitude and longitude to support routing and incident context.',
  })
  @ApiQuery({
    name: 'latitude',
    required: true,
    type: Number,
    description: 'Latitude coordinate',
    example: 32.1744,
  })
  @ApiQuery({
    name: 'longitude',
    required: true,
    type: Number,
    description: 'Longitude coordinate',
    example: 35.2856,
  })
  @ApiOkResponse({
    description: 'Current weather returned successfully',
    type: CurrentWeatherResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid weather query parameters',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  getCurrentWeather(
    @Query() query: CurrentWeatherQueryDto,
  ): Promise<CurrentWeatherResponseDto> {
    return this.weatherService.getCurrentWeather(query);
  }
}
