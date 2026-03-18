import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { PasswordService } from 'src/services/password/password.service';   
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { User } from 'src/users/entities/user.entity';


@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService, 
    private jwtService: JwtService, 
    private passwordService: PasswordService
  ) {}

  /**
   * Sign in user and return JWT token
   */
  async signIn(email: string, password: string): Promise<{ access_token: string }> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken(user);
  }

  /**
   * Register new user and return JWT token
   */
  async register(registerDto: RegisterDto): Promise<{ access_token: string }> {
    
    const user = await this.usersService.create({
      email: registerDto.email,
      password: registerDto.password,
      firstname: registerDto.firstname,
      lastname: registerDto.lastname,
      phone: registerDto.phone,
      address: registerDto.address,
    });

    return this.generateToken(user);
  }

  /**
   * Generate JWT access token for user
   */
  private generateToken(user: User): { access_token: string } {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    
    return {
      access_token: this.jwtService.sign(payload)
    };
  }
}
