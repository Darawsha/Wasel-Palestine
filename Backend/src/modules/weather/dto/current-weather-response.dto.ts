import { ApiProperty } from '@nestjs/swagger';

export class CurrentWeatherResponseDto {
  @ApiProperty({
    description: 'Describes the location name field.',
    example: 'Awarta'
  })
  locationName: string;

  @ApiProperty({
    description: 'Describes the latitude field.',
    example: 32.1744
  })
  latitude: number;

  @ApiProperty({
    description: 'Describes the longitude field.',
    example: 35.2856
  })
  longitude: number;

  @ApiProperty({
    description: 'Describes the temperature celsius field.',
    example: 19.3
  })
  temperatureCelsius: number;

  @ApiProperty({
    description: 'Describes the condition text field.',
    example: 'Partly cloudy'
  })
  conditionText: string;

  @ApiProperty({
    description: 'Describes the wind kph field.',
    example: 12.6
  })
  windKph: number;

  @ApiProperty({
    description: 'Describes the is day field.',
    example: true
  })
  isDay: boolean;

  @ApiProperty({
    description: 'Describes the observed at field.',
    example: '2026-04-09 14:25'
  })
  observedAt: string;
}
