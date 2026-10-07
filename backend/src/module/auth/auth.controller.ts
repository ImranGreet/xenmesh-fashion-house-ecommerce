import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  CurrentUser,
  Public,
  SignInService,
} from '@nestjs/authentication';
import type { AdminUser } from './auth.types.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly signInService: SignInService,
  ) {}

  @Public()
  @Post('sign-in')
  signIn(@Body() body: unknown) {
    return this.authService.signIn(body);
  }

  @Get('me')
  currentUser(@CurrentUser() user: AdminUser) {
    return { user };
  }

  @Post('sign-out')
  async signOut() {
    await this.signInService.signOut();
    return { success: true };
  }
}
