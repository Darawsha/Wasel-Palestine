import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAlertPreferenceDto {
  @ApiProperty({
    description: 'Geographic area the user wants to monitor',
    type: String,
    example: 'Area-{{$randomInt}}',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  geographicArea: string;

  @ApiProperty({
    description: 'Incident category that triggers alerts',
    type: String,
    example: 'category-{{$randomInt}}',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  incidentCategory: string;
}
