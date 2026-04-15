import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ApiProperty } from '@nestjs/swagger';

function normalizeOptional(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return value;
}

function toOptionalPositiveNumber(value: unknown): unknown {
  const normalized = normalizeOptional(value);
  if (normalized === undefined) {
    return undefined;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

export class UserQueryDto {
  @ApiProperty({
    required: false,
    description: 'Filter users by role',
    enum: UserRole,
    example: UserRole.CITIZEN,
  })
  @Transform(({ value }) => normalizeOptional(value))
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({
    required: false,
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @Transform(({ value }) => toOptionalPositiveNumber(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    required: false,
    description: 'Items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @Transform(({ value }) => toOptionalPositiveNumber(value))
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;
}
