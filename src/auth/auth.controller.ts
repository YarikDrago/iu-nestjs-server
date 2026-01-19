import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
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

  @Get('check-access-token')
  checkAccessToken(@Req() req: Request) {
    console.log('try to check access token');
    const rawCookieHeader = req.headers.cookie ?? '';
    const cookies = cookie.parse(rawCookieHeader);
    const accessToken = cookies['accessToken'];
    if (!accessToken) {
      console.log('access Token is not found');
      throw new UnauthorizedException('Access token is not found');
    }
    this.authService.checkAccessToken(accessToken);
    return true;
  }

  @Get('check-refresh-token')
  async checkRefreshToken(@Req() req: Request) {
    console.log('try to check refresh token');
    const rawCookieHeader = req.headers.cookie ?? '';
    const cookies = cookie.parse(rawCookieHeader);
    const refreshToken = cookies['refreshToken'];
    // TODO if token is not found???
    if (!refreshToken) {
      console.log('refresh Token is not found');
      return false;
    }
    console.log('refresh Token:', refreshToken);
    const result = await this.refreshTokenService.check(refreshToken);
    console.log('result:', result);
    return result;
  }

  @Get('refresh-tokens')
  async refreshTokens(@Req() req: Request) {
    try {
      console.log('try to refresh session');
      const rawCookieHeader = req.headers.cookie ?? '';
      const cookies = cookie.parse(rawCookieHeader);
      const refreshToken = cookies['refreshToken'];
      if (!refreshToken) {
        console.log('refresh Token is not found');
        // TODO logout???
        return false;
      }
      console.log('refresh Token:', refreshToken);
      const result = await this.authService.refreshSession(refreshToken);
      return result;
    } catch (e) {
      console.log('error:', e);
      throw new HttpException((e as Error).message, HttpStatus.BAD_REQUEST);
    }
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
