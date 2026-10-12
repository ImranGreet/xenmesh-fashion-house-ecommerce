import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { SettingsService } from './settings.service.js';

@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get('store/settings')
  getPublicSettings() {
    return this.settingsService.getSettings();
  }

  @Patch('admin/settings')
  updateSettings(@Body() body: unknown) {
    return this.settingsService.updateSettings(body);
  }
}
