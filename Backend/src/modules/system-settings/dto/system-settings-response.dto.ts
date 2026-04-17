import { ApiProperty } from '@nestjs/swagger';
import { PrimaryLanguage } from '../enums/primary-language.enum';

export class SystemSettingsResponseDto {
  @ApiProperty({ example: 'Wasel Palestine' })
  platformName: string;

  @ApiProperty({
    enum: PrimaryLanguage,
    example: PrimaryLanguage.ENGLISH,
  })
  primaryLanguage: PrimaryLanguage;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}
