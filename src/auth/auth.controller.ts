import { Controller, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import * as cookie from 'cookie';
import type { Request } from 'express';
import { RefreshTokenService } from '../refreshToken/refresh-token.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  @Get('check-refresh-token')
  async checkRefreshToken(@Req() req: Request) {
    console.log('try to check refresh token');
    const rawCookieHeader = req.headers.cookie ?? '';
    const cookies = cookie.parse(rawCookieHeader);
    const refreshToken = cookies['refreshToken'];
    // TODO if token is not found???
    if (!refreshToken) return false;
    console.log('refresh Token:', refreshToken);
    const result = await this.refreshTokenService.check(refreshToken);
    console.log('result:', result);
    return result;
  }

  @Get('revoke-refresh-token')
  async revokeRefreshToken(@Req() req: Request) {
    console.log('try to revoke refresh token');
    const rawCookieHeader = req.headers.cookie ?? '';
    const cookies = cookie.parse(rawCookieHeader);
    const refreshToken = cookies['refreshToken'];

    if (!refreshToken) return false;
    console.log('refresh Token:', refreshToken);
    await this.refreshTokenService.revoke(refreshToken);
    console.log('refresh token revoked');
    return true;
  }
}
