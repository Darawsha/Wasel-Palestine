import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAlertPreferenceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  geographicArea: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  incidentCategory: string;
}
