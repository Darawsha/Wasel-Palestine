import { ApiProperty } from '@nestjs/swagger';

export class CurrentWeatherResponseDto {
  @ApiProperty({ example: 'Awarta' })
  locationName: string;

  @ApiProperty({ example: 32.1744 })
  latitude: number;

  @ApiProperty({ example: 35.2856 })
  longitude: number;

  @ApiProperty({ example: 19.3 })
  temperatureCelsius: number;

  @ApiProperty({ example: 'Partly cloudy' })
  conditionText: string;

  @ApiProperty({ example: 12.6 })
  windKph: number;

  @ApiProperty({ example: true })
  isDay: boolean;

  @ApiProperty({ example: '2026-04-09 14:25' })
  observedAt: string;
}
