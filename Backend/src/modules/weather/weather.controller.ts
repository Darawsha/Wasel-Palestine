import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CurrentWeatherQueryDto } from './dto/current-weather-query.dto';
import { CurrentWeatherResponseDto } from './dto/current-weather-response.dto';
import { WeatherService } from './weather.service';

@ApiTags('Weather')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'weather', version: '1' })
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('current')
  @ApiOperation({
    summary: 'Get live weather for a specific coordinate pair',
  })
  @ApiResponse({
    status: 200,
    type: CurrentWeatherResponseDto,
  })
  getCurrentWeather(
    @Query() query: CurrentWeatherQueryDto,
  ): Promise<CurrentWeatherResponseDto> {
    return this.weatherService.getCurrentWeather(query);
  }
}
