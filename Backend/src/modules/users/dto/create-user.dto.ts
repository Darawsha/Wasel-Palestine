import { IsString, IsEmail, IsOptional, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
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
    description: 'Email address (must be unique)',
    type: String,
    example: '{{$randomEmail}}',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'Account password (minimum 8 characters)',
    type: String,
    example: 'CitizenPass123',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @ApiProperty({
    required: false,
    description: 'Phone number (10-15 digits)',
    type: String,
    example: '{{$randomPhoneNumber}}',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[+()\-\s0-9]{7,20}$/, {
    message: 'Phone must be a valid phone number format',
  })
  phone?: string;

  @ApiProperty({
    required: false,
    description: 'Postal address',
    type: String,
    example: 'Ramallah - Al-Tireh',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Address must not exceed 200 characters' })
  address?: string;

  @ApiProperty({
    required: false,
    description: 'Role assigned to the user',
    enum: UserRole,
    example: UserRole.CITIZEN,
  })
  @IsOptional()
  role?: UserRole;
}
