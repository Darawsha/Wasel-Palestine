import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignInDto {
  @ApiProperty({
    description:
      'User email address used for authentication. Admin test email: mohammadawwad044@gmail.com. Citizen test email: mohammadawwad069@gmail.com.',
    type: String,
    example: 'mohammadawwad044@gmail.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description:
      'User account password. Admin test password: Mm123456789. Citizen test password: Mm12218103.',
    type: String,
    example: 'Mm123456789',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
