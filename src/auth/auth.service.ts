import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RefreshTokenService } from '../refreshToken/refresh-token.service';
import { UsersService } from '../users/users.service';
import * as jwt from 'jsonwebtoken';
import type { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private readonly refreshTokenService: RefreshTokenService,
    private readonly usersService: UsersService,
  ) {}

  checkAccessToken(accessToken: string) {
    console.log('access Token:', accessToken);
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new HttpException(
        'JWT_ACCESS_SECRET is not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    try {
      jwt.verify(accessToken, secret);
      console.log('access token is valid');
      return true;
    } catch (e) {
      console.log('access token is invalid:', (e as Error).message);
      throw new UnauthorizedException('Access token is invalid');
    }
  }

  async refreshSession(refreshToken: string) {
    /* 1) Check refresh token and get user ID
     * 2) Find user by ID
     * 3) Revoke old token
     * 3) Generate new tokens (access + refresh)
     * 4) Save refresh token to the DB */
    console.log('try to refresh session (service)');
    console.log('refresh token from client: ', refreshToken);

    if (!refreshToken) {
      console.log('Error: ', 'refreshToken is required');
      throw new UnauthorizedException('refreshToken is required');
    }

    /* Check refresh token */
    const check = await this.refreshTokenService.check(refreshToken);
    if (!check) {
      console.log('Error: ', 'Refresh token is invalid');
      throw new UnauthorizedException('Refresh token is invalid');
    }
    console.log('Refresh token is valid');

    // TODO activate
    /* Revoking old token */
    // await this.refreshTokenService.revoke(refreshToken);
    // console.log('refreshToken revoked');

    // TODO make universal and use also in login
    /* Generate a new pair of tokens */
    const tokens = this.refreshTokenService.generateTokens({
      email: check.user.email,
      nickname: check.user.nickname,
    });
    console.log('new refresh token: ', tokens.refreshToken);
    console.log('new access token: ', tokens.accessToken);
    /* Save a refresh token to the DB */
    await this.refreshTokenService.save(check.user.id, tokens.refreshToken);
    console.log('refresh token saved');

    return tokens;
  }

  writeTokensToCookies(
    accessToken: string,
    refreshToken: string,
    res: Response,
    /* Set cookie to reset it after logout */
    resetCookie: boolean = false,
  ) {
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: resetCookie ? 0 : 30 * 60 * 1000, // 30m
      path: '/',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: resetCookie ? 0 : 7 * 24 * 60 * 60 * 1000, // 7d (подстрой под свою политику)
      path: '/',
    });
  }
}
