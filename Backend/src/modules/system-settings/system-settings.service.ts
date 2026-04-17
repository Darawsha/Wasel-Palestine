import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';
import { SystemSettings } from './entities/system-settings.entity';
import { PrimaryLanguage } from './enums/primary-language.enum';

const SETTINGS_ROW_ID = 1;
const DEFAULT_SETTINGS = {
  platformName: 'Wasel Palestine',
  primaryLanguage: PrimaryLanguage.ENGLISH,
};

@Injectable()
export class SystemSettingsService {
  constructor(
    @InjectRepository(SystemSettings)
    private readonly settingsRepository: Repository<SystemSettings>,
  ) {}

  async getSettings(): Promise<SystemSettings> {
    const existingSettings = await this.settingsRepository.findOne({
      where: { id: SETTINGS_ROW_ID },
    });

    if (existingSettings) {
      return existingSettings;
    }

    const defaultSettings = this.settingsRepository.create({
      id: SETTINGS_ROW_ID,
      ...DEFAULT_SETTINGS,
    });

    return this.settingsRepository.save(defaultSettings);
  }

  async updateSettings(
    updateSystemSettingsDto: UpdateSystemSettingsDto,
  ): Promise<SystemSettings> {
    const currentSettings = await this.getSettings();

    currentSettings.platformName = updateSystemSettingsDto.platformName;
    currentSettings.primaryLanguage = updateSystemSettingsDto.primaryLanguage;

    return this.settingsRepository.save(currentSettings);
  }
}
