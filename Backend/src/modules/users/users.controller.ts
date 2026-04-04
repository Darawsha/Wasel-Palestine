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
import { AuthGuard } from '@nestjs/passport';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createFromCollection(@Body() createUserDto: CreateUserDto) {
    return this.create(createUserDto);
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return this.toUserResponse(user);
  }

  @Get()
  async findAll(@Query() userQueryDto: UserQueryDto) {
    const result = await this.usersService.findAll(userQueryDto);
    return {
      data: result.data.map((user) => this.toUserResponse(user)),
      meta: result.meta,
    };
  }

  @Get('citizens')
  @Roles(UserRole.ADMIN)
  async findAllCitizens(@Query() userQueryDto: UserQueryDto) {
    const result = await this.usersService.findAllCitizens(userQueryDto);
    return {
      data: result.data.map((user) => this.toUserResponse(user)),
      meta: result.meta,
    };
  }

  @Get('me')
  @Roles(UserRole.ADMIN, UserRole.CITIZEN)
  async findCurrentUser(@Request() req: { user: { userId: number } }) {
    const user = await this.usersService.findOne(req.user.userId);
    return this.toUserResponse(user);
  }

  @Get('counts')
  @HttpCode(HttpStatus.OK)
  async countCitizens() {
    const count = await this.usersService.countCitizens();
    return { count };
  }

  @Get('registration-trend')
  @HttpCode(HttpStatus.OK)
  getCitizensRegistrationTrend(@Query('days') days?: string) {
    return this.usersService.getCitizensRegistrationTrend(
      days ? Number(days) : undefined,
    );
  }

  @Get('registration-buckets')
  @HttpCode(HttpStatus.OK)
  getCitizenRegistrationBuckets(@Query('months') months?: string) {
    return this.usersService.getCitizenRegistrationBuckets(
      months ? Number(months) : undefined,
    );
  }
  @Get('search/email')
  async findByEmail(@Query('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    return this.toUserResponse(user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(+id);
    return this.toUserResponse(user);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(+id, updateUserDto);
    return this.toUserResponse(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
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

