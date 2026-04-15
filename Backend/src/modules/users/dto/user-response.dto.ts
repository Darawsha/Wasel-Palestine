import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaResponseDto } from '../../../common/dto/common-response.dto';
import { UserRole } from '../../../common/enums/user-role.enum';

export class UserResponseDto {
  @ApiProperty({
    description: 'Describes the id field.',
    example: 7
  })
  id: number;

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
    description: 'Describes the email field.',
    example: 'ahmad@wasel.ps'
  })
  email: string;

  @ApiProperty({
    description: 'Describes the role field.',
    enum: UserRole, example: UserRole.CITIZEN
  })
  role: UserRole;

  @ApiProperty({
    description: 'Describes the phone field.',
    example: '0599123456', nullable: true
  })
  phone?: string | null;

  @ApiProperty({
    description: 'Describes the address field.',
    example: 'Ramallah - Al-Tireh', nullable: true
  })
  address?: string | null;

  @ApiProperty({
    description: 'Describes the created at field.',
    example: '2026-04-13T08:00:00.000Z'
  })
  createdAt: string;

  @ApiProperty({
    description: 'Describes the updated at field.',
    example: '2026-04-13T09:05:00.000Z'
  })
  updatedAt: string;
}

export class UserPaginatedResponseDto {
  @ApiProperty({
    description: 'Describes the data field.',
    type: [UserResponseDto],
    example: [
      {
        id: 7,
        firstname: 'Ahmad',
        lastname: 'Khaled',
        email: 'ahmad@wasel.ps',
        role: 'citizen',
        phone: '0599123456',
        address: 'Ramallah - Al-Tireh',
        createdAt: '2026-04-13T08:00:00.000Z',
        updatedAt: '2026-04-13T09:05:00.000Z',
      },
    ],
  })
  data: UserResponseDto[];

  @ApiProperty({
    description: 'Describes the meta field.',
    type: PaginationMetaResponseDto,
    example: {
      total: 125,
      page: 1,
      limit: 10,
      totalPages: 13,
    },
  })
  meta: PaginationMetaResponseDto;
}
