import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums/user-role.enum';
import { PrimaryLanguage } from '../../system-settings/enums/primary-language.enum';

export class AuthUserResponseDto {
  @ApiProperty({
    description: 'Describes the id field.',
    example: 7
  })
  id: number;

  @ApiProperty({
    description: 'Describes the email field.',
    example: 'admin@wasel.ps'
  })
  email: string;

  @ApiProperty({
    description: 'Describes the role field.',
    enum: UserRole, example: UserRole.ADMIN
  })
  role: UserRole;

  @ApiProperty({
    description: 'Describes the firstname field.',
    example: 'Ahmad'
  })
  firstname: string;

  @ApiProperty({
    description: 'Describes the lastname field.',
    example: 'Khaled'
  })
  lastname: string;

  @ApiProperty({
    description: 'User-specific application language preference.',
    enum: PrimaryLanguage,
    example: PrimaryLanguage.ENGLISH
  })
  language: PrimaryLanguage;
}

export class AuthTokenResponseDto {
  @ApiProperty({
    description: 'Describes the access token field.',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjcsImVtYWlsIjoiYWRtaW5Ad2FzZWwucHMiLCJyb2xlIjoiYWRtaW4ifQ.signature',
  })
  access_token: string;

  @ApiProperty({
    description: 'Describes the user field.',
    type: AuthUserResponseDto,
    example: {
      id: 7,
      email: 'admin@wasel.ps',
      role: 'admin',
      firstname: 'Ahmad',
      lastname: 'Khaled',
      language: 'English',
    },
  })
  user: AuthUserResponseDto;
}

export class AuthProfileResponseDto {
  @ApiProperty({
    description: 'Describes the id field.',
    example: 7
  })
  id: number;

  @ApiProperty({
    description: 'Describes the email field.',
    example: 'admin@wasel.ps'
  })
  email: string;

  @ApiProperty({
    description: 'Describes the role field.',
    enum: UserRole, example: UserRole.ADMIN
  })
  role: UserRole;

  @ApiProperty({
    description: 'User-specific application language preference.',
    enum: PrimaryLanguage,
    example: PrimaryLanguage.ENGLISH
  })
  language: PrimaryLanguage;
}
