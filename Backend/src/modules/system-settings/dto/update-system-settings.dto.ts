import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PrimaryLanguage } from '../enums/primary-language.enum';

export class UpdateSystemSettingsDto {
  @ApiProperty({
    description: 'Public platform display name',
    example: 'Wasel Palestine',
    maxLength: 150,
  })
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  platformName: string;

  @ApiProperty({
    description: 'Primary platform language',
    enum: PrimaryLanguage,
    example: PrimaryLanguage.ENGLISH,
  })
  @IsEnum(PrimaryLanguage)
  primaryLanguage: PrimaryLanguage;
}
