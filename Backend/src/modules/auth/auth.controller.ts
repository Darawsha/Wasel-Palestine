import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RegisterDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LinkedinLoginDto } from './dto/linkedin-login.dto';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(
    @Request() req: { user: { userId: number; email: string; role: string } },
  ) {
    return {
      id: req.user.userId,
      email: req.user.email,
      role: req.user.role,
    };
  }

  @Post('google')
  async googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto.accessToken);
  }

  @Get('linkedin')
  linkedinRedirect(
    @Req() req: ExpressRequest,
    @Res() res: ExpressResponse,
  ) {
    const authUrl = this.authService.getLinkedinAuthorizationUrl(
      this.getRequestOrigin(req),
    );

    return res.redirect(authUrl);
  }

  @Get('linkedin/callback')
  linkedinCallback(
    @Req() req: ExpressRequest,
    @Res() res: ExpressResponse,
  ) {
    const code = this.getQueryStringValue(req.query.code);
    const state = this.getQueryStringValue(req.query.state);

    const callbackUrl = this.authService.getLinkedinFrontendCallbackUrl(
      code,
      state,
    );

    return res.redirect(callbackUrl);
  }

  @Post('linkedin')
  async linkedinLogin(@Body() dto: LinkedinLoginDto) {
    return this.authService.linkedinLogin(dto.code, dto.state);
  }

  private getRequestOrigin(req: ExpressRequest): string {
    const forwardedProto = req.headers['x-forwarded-proto'];
    const protocolHeader = Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : forwardedProto;
    const protocol = protocolHeader?.split(',')[0]?.trim() || req.protocol;

    return `${protocol}://${req.get('host')}`;
  }

  private getQueryStringValue(value: unknown): string | undefined {
    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value) && typeof value[0] === 'string') {
      return value[0];
    }

    return undefined;
  }
}
