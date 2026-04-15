import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'First name of the user',
    type: String,
    example: '{{$randomFirstName}}',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstname: string;

  @ApiProperty({
    description: 'Last name of the user',
    type: String,
    example: '{{$randomLastName}}',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastname: string;

  @ApiProperty({
    description: 'Email used for login (must be unique)',
    type: String,
    example: '{{$randomEmail}}',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description:
      'Password with at least one uppercase letter, one lowercase letter, and one number',
    type: String,
    example: 'SecurePass1',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @ApiProperty({
    required: false,
    description: 'Optional phone number (7-15 digits, optional leading +)',
    type: String,
    example: '{{$randomPhoneNumber}}',
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value === '' ? undefined : value,
  )
  @IsString()
  @Matches(/^[+()\-\s0-9]{7,20}$/, {
    message: 'Phone must be a valid phone number format',
  })
  phone?: string;

  @ApiProperty({
    required: false,
    description: 'Optional postal address',
    type: String,
    example: 'Ramallah, Al-Masyoun',
    maxLength: 200,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value === '' ? undefined : value,
  )
  @IsString()
  @MaxLength(200, { message: 'Address must not exceed 200 characters' })
  address?: string;
}
