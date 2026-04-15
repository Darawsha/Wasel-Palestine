import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums/user-role.enum';

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
}
