import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstname?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastname?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === '' ? null : typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_object, value) => value !== null && value !== undefined)
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'Phone must be 7-15 digits' })
  phone?: string | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === '' ? null : typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_object, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(200, { message: 'Address must not exceed 200 characters' })
  address?: string | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === '' ? null : typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_object, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(1000000, {
    message: 'Profile image payload must not exceed 1,000,000 characters',
  })
  profileImage?: string | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === '' ? undefined : typeof value === 'string' ? value : value,
  )
  @IsString()
  currentPassword?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === '' ? undefined : typeof value === 'string' ? value : value,
  )
  @IsString()
  @MinLength(8, {
    message: 'New password must be at least 8 characters long',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'New password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword?: string;
}
