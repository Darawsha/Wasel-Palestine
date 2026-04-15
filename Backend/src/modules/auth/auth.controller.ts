import {
  Controller,
  Body,
  Post,
  Get,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RegisterDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
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
import {
  AuthProfileResponseDto,
  AuthTokenResponseDto,
} from './dto/auth-response.dto';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../common/dto/error-response.dto';

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

  // Protected route example - returns current user profile
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
    @Request() req: { user: { userId: number; email: string; role: string } },
  ) {
    return {
      id: req.user.userId,
      email: req.user.email,
      role: req.user.role,
    };
  }
}
