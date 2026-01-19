import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import * as cookie from 'cookie';
import type { Request } from 'express';
import { RefreshTokenService } from '../refreshToken/refresh-token.service';
import { LoginUserDto } from '../users/dto/login-user.dto';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  @Post('login')
  async login(@Body() dto: LoginUserDto) {
    try {
      console.log('try to login user');
      if (!dto || !dto.email || !dto.password) {
        throw new HttpException(
          'Email and password are required',
          HttpStatus.BAD_REQUEST,
        );
      }
      console.log('dto:', dto);
      const user = await this.usersService.findUserByEmail(dto.email);
      if (!user) {
        console.log('user not found');
        throw new HttpException(
          'Incorrect credentials',
          HttpStatus.BAD_REQUEST,
        );
      }
      console.log('user:', user);
      if (user.status.name === 'inactive') {
        throw new HttpException(
          'Incorrect credentials',
          HttpStatus.BAD_REQUEST,
        );
      }
      console.log('user is active');
      // Compare hashes of passwords
      const isMatch = await bcrypt.compare(dto.password, user.password);
      console.log('passwords is match:', isMatch);
      if (!isMatch)
        throw new HttpException(
          'Incorrect credentials',
          HttpStatus.BAD_REQUEST,
        );
      /* Generate a new pair of tokens */
      const tokens = this.refreshTokenService.generateTokens({
        email: user.email,
        nickname: user.nickname,
      });
      console.log('tokens:', tokens);
      /* Save a refresh token to the DB */
      await this.refreshTokenService.save(user.id, tokens.refreshToken);
      console.log('refresh token saved');
      return {
        refreshToken: tokens.refreshToken,
        accessToken: tokens.accessToken,
        nickname: user.nickname,
      };
    } catch (e) {
      throw new HttpException((e as Error).message, HttpStatus.BAD_REQUEST);
    }
  }

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
      console.log('try to refresh tokens');
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

  @Post('logout')
  async logout(@Body() { refreshToken }: { refreshToken: string }) {
    try {
      console.log('try to logout user');
      console.log('refreshToken:', refreshToken);
      if (!refreshToken) {
        return { message: 'User successfully logged out' };
      }
      await this.refreshTokenService.delete(refreshToken);
      console.log('refresh token deleted');
      return { message: 'User successfully logged out' };
    } catch (e) {
      throw new HttpException((e as Error).message, HttpStatus.BAD_REQUEST);
    }
  }
}
