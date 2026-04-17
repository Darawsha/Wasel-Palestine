import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Request,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RegisterDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LinkedinLoginDto } from './dto/linkedin-login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  AuthProfileResponseDto,
  AuthTokenResponseDto,
} from './dto/auth-response.dto';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../common/dto/error-response.dto';

type AuthenticatedRequestUser = {
  userId?: number;
  sub?: number;
  email?: string;
  role?: string;
};

@ApiTags('Authentication')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in with email and password',
    description:
      'Authenticates a user with email and password and returns a JWT access token with basic user profile details.',
  })
  @ApiBody({
    schema: { $ref: getSchemaPath(SignInDto) },
    examples: {
      admin: {
        summary: 'Admin Login',
        value: {
          email: 'mohammadawwad044@gmail.com',
          password: 'Mm123456789',
        },
      },
      citizen: {
        summary: 'Citizen Login',
        value: {
          email: 'mohammadawwad069@gmail.com',
          password: 'Mm12218103',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Signed in successfully',
    type: AuthTokenResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid sign-in payload',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new account',
    description:
      'Creates a new user account using the provided profile fields and returns a JWT access token with the created user profile.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'Account created successfully',
    type: AuthTokenResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid registration payload',
    type: ValidationErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email already in use',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('token')
  @Get('profile')
  @ApiOperation({
    summary: 'Get the authenticated user profile',
    description:
      'Returns the currently authenticated user identity extracted from the validated JWT token.',
  })
  @ApiOkResponse({
    description: 'Authenticated profile returned',
    type: AuthProfileResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Access denied',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  getProfile(
    @Request() req: { user: AuthenticatedRequestUser },
  ) {
    return this.authService.getProfile(this.getAuthenticatedUserId(req.user));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(
    @Request() req: { user: AuthenticatedRequestUser },
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(
      this.getAuthenticatedUserId(req.user),
      updateProfileDto,
    );
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

  private getAuthenticatedUserId(user: AuthenticatedRequestUser): number {
    const rawUserId = user?.userId ?? user?.sub;
    const userId = Number(rawUserId);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user id not found');
    }

    return userId;
  }
}
