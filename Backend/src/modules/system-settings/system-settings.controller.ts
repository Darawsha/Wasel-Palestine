import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../common/dto/error-response.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { SystemSettingsResponseDto } from './dto/system-settings-response.dto';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';
import { SystemSettings } from './entities/system-settings.entity';
import { SystemSettingsService } from './system-settings.service';

@ApiTags('System Settings')
@ApiBearerAuth('token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'system-settings', version: '1' })
export class SystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get editable system settings',
    description:
      'Returns persisted platform display settings for the admin settings page.',
  })
  @ApiOkResponse({
    description: 'System settings returned',
    type: SystemSettingsResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  async getSettings() {
    const settings = await this.systemSettingsService.getSettings();
    return this.toResponse(settings);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update editable system settings',
    description:
      'Persists platform name and primary language. Primary language is limited to English or Arabic.',
  })
  @ApiOkResponse({
    description: 'System settings updated',
    type: SystemSettingsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid settings payload',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  async updateSettings(@Body() updateSystemSettingsDto: UpdateSystemSettingsDto) {
    const settings = await this.systemSettingsService.updateSettings(
      updateSystemSettingsDto,
    );
    return this.toResponse(settings);
  }

  private toResponse(settings: SystemSettings): SystemSettingsResponseDto {
    return {
      platformName: settings.platformName,
      primaryLanguage: settings.primaryLanguage,
      updatedAt: settings.updatedAt,
    };
  }
}
