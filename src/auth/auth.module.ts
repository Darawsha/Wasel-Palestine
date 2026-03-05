import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
  
import { UsersModule } from 'src/users/users.module';
import { ServicesModule } from 'src/services/services.module';
import { JwtStrategy } from './jwt/jwt.strategy';
import { ConfigModule } from '@nestjs/config';

@Module({

  imports: [
    UsersModule,
    ServicesModule, ConfigModule.forRoot(),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN as any },
    })
  ],

  providers: [AuthService, JwtStrategy],
  controllers: [AuthController] 
})
export class AuthModule {}
