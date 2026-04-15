import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserPaginatedResponseDto, UserResponseDto } from './dto/user-response.dto';
import {
  CountResponseDto,
  RegistrationBucketsResponseDto,
  RegistrationTrendResponseDto,
} from '../../common/dto/common-response.dto';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../common/dto/error-response.dto';

@ApiTags('Users')
@ApiBearerAuth('token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a user (collection-style endpoint)',
    description:
      'Creates a user record with role and profile attributes, applying password hashing and uniqueness checks.',
  })
  @ApiCreatedResponse({
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid user payload',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email already in use',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  createFromCollection(@Body() createUserDto: CreateUserDto) {
    return this.create(createUserDto);
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a user',
    description:
      'Creates a user record with role and profile attributes, applying password hashing and uniqueness checks.',
  })
  @ApiCreatedResponse({
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid user payload',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email already in use',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return this.toUserResponse(user);
  }

  @Get()
  @ApiOperation({
    summary: 'List users with filtering and pagination',
    description:
      'Returns a paginated list of users with optional role filtering for administrative user management.',
  })
  @ApiQuery({ name: 'role', required: false, enum: ['admin', 'citizen'], example: 'citizen' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description: 'User list returned',
    type: UserPaginatedResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  async findAll(@Query() userQueryDto: UserQueryDto) {
    const result = await this.usersService.findAll(userQueryDto);
    return {
      data: result.data.map((user) => this.toUserResponse(user)),
      meta: result.meta,
    };
  }

  @Get('citizens')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'List all citizens',
    description:
      'Returns a paginated list of citizen users for administrative monitoring and management.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description: 'Citizen list returned',
    type: UserPaginatedResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  async findAllCitizens(@Query() userQueryDto: UserQueryDto) {
    const result = await this.usersService.findAllCitizens(userQueryDto);
    return {
      data: result.data.map((user) => this.toUserResponse(user)),
      meta: result.meta,
    };
  }

  @Get('me')
  @Roles(UserRole.ADMIN, UserRole.CITIZEN)
  @ApiOperation({
    summary: 'Get the currently authenticated user profile',
    description:
      'Returns the profile payload of the current authenticated principal extracted from the JWT token.',
  })
  @ApiOkResponse({
    description: 'Current user returned',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Insufficient role permissions',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  async findCurrentUser(@Request() req: { user: { userId: number } }) {
    const user = await this.usersService.findOne(req.user.userId);
    return this.toUserResponse(user);
  }

  @Get('counts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get total citizen count',
    description:
      'Returns the total number of users with the citizen role for dashboard KPIs.',
  })
  @ApiOkResponse({
    description: 'Citizen count returned',
    type: CountResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  async countCitizens() {
    const count = await this.usersService.countCitizens();
    return { count };
  }

  @Get('registration-trend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get citizen registrations trend by day',
    description:
      'Computes the current and previous registration periods and returns percentage change over the selected day window.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to include in trend data',
    example: 7,
  })
  @ApiOkResponse({
    description: 'Registration trend returned',
    type: RegistrationTrendResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid days query parameter',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  getCitizensRegistrationTrend(@Query('days') days?: string) {
    return this.usersService.getCitizensRegistrationTrend(
      days ? Number(days) : undefined,
    );
  }

  @Get('registration-buckets')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get citizen registration buckets by month',
    description:
      'Returns month-by-month citizen registration bucket counts for the selected period.',
  })
  @ApiQuery({
    name: 'months',
    required: false,
    type: Number,
    description: 'Number of months to include in bucketed data',
    example: 6,
  })
  @ApiOkResponse({
    description: 'Registration buckets returned',
    type: RegistrationBucketsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid months query parameter',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  getCitizenRegistrationBuckets(@Query('months') months?: string) {
    return this.usersService.getCitizenRegistrationBuckets(
      months ? Number(months) : undefined,
    );
  }

  @Get('search/email')
  @ApiOperation({
    summary: 'Find a user by email address',
    description:
      'Looks up a user by normalized email and returns the matching profile when present.',
  })
  @ApiQuery({
    name: 'email',
    required: true,
    type: String,
    description: 'Email address to search for',
    example: 'mohammadawwad069@gmail.com',
  })
  @ApiOkResponse({
    description: 'User returned if found',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid email query parameter',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  async findByEmail(@Query('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    return this.toUserResponse(user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a user by id',
    description:
      'Returns a user profile by numeric identifier for admin-driven account inspection.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'User identifier',
    example: 24,
  })
  @ApiOkResponse({
    description: 'User returned',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid user identifier',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(+id);
    return this.toUserResponse(user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a user by id',
    description:
      'Updates mutable fields for a user account and returns the updated profile data.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'User identifier',
    example: 24,
  })
  @ApiOkResponse({
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid user identifier or update payload',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email already in use',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(+id, updateUserDto);
    return this.toUserResponse(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a user by id',
    description:
      'Deletes a user account by identifier when it exists and returns no content on success.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'User identifier',
    example: 24,
  })
  @ApiNoContentResponse({ description: 'User deleted successfully' })
  @ApiBadRequestResponse({
    description: 'Invalid user identifier',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }

  private toUserResponse(user: User | null) {
    if (!user) {
      return null;
    }

    const { password, ...safeUser } = user;
    return safeUser;
  }
}

