import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  RefreshTokenService,
  TokenPayload,
} from '../refreshToken/refresh-token.service';
import { UsersService } from '../users/users.service';
import * as jwt from 'jsonwebtoken';
import type { Response, Request } from 'express';
import * as cookie from 'cookie';
import { User } from '../users/entities/user.entity';
import { ResetPassword } from './entities/reset_passowrd.entity';
import { IsNull, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly refreshTokenService: RefreshTokenService,
    private readonly usersService: UsersService,
    @InjectRepository(ResetPassword)
    private readonly resetPasswordRepo: Repository<ResetPassword>,
  ) {}

  private getCookieOrThrow(req: Request, name: string): string {
    const rawCookieHeader = req.headers.cookie ?? '';
    const cookies = cookie.parse(rawCookieHeader);
    const value = cookies[name];

    if (!value) {
      throw new UnauthorizedException(`${name} is not found`);
    }

    return value;
  }

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
      return jwt.decode(accessToken) as TokenPayload;
    } catch (e) {
      console.log('access token is invalid:', (e as Error).message);
      throw new UnauthorizedException('Access token is invalid');
    }
  }

  checkAccessTokenFromRequest(req: Request): TokenPayload {
    const accessToken = this.getCookieOrThrow(req, 'accessToken');
    return this.checkAccessToken(accessToken);
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

  async checkUserRolesByRequest(req: Request, requiredRoles: string[]) {
    const tokenPayload = this.checkAccessTokenFromRequest(req);
    const email = tokenPayload.email;
    const user = await this.usersService.findUserByEmail(email, true);
    if (!user) {
      console.log('User not found');
      throw new UnauthorizedException('User not found');
    }

    if (!this.checkUserRoles(user, requiredRoles)) {
      throw new UnauthorizedException(
        'User does not have permission to access this route. Please contact the administrator.',
      );
    }
  }

  checkUserRoles(user: User, requiredRoles: string[]): boolean {
    const roles = user.userRoles.map((ur) => ur.role.name);
    return requiredRoles.every((role) => roles.includes(role));
  }

  async createNewResetPassword(userId: number) {
    /* Generate random reset token (what we return to user / put in email) */
    const resetToken = randomBytes(32).toString('hex');

    /* Store only hash in DB */
    const resetTokenHash = createHash('sha256')
      .update(resetToken)
      .digest('hex');

    /* Revoke all old reset tokens for this user */
    await this.resetPasswordRepo.update(
      { user_id: userId, revoked_at: IsNull() },
      { revoked_at: new Date() },
    );

    /* Create new reset token in the DB */
    // const expirationDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const record = this.resetPasswordRepo.create({
      user_id: userId,
      token_hash: resetTokenHash,
      // expiration_date: expirationDate,
      // created_at: new Date(),
      // usedAt: null,
    });

    await this.resetPasswordRepo.save(record);

    return resetToken;
  }

  async checkResetPasswordToken(token: string) {
    console.log('try to check reset password token');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const resetToken = await this.resetPasswordRepo.findOne({
      where: { token_hash: tokenHash },
      relations: {
        user: true,
      },
    });
    console.log('resetToken:', resetToken);
    if (!resetToken) {
      console.log('Reset token is not found');
      throw new UnauthorizedException('Reset token is not found');
    }
    if (resetToken.revoked_at) {
      console.log('Reset token is revoked');
      throw new UnauthorizedException('Reset token is revoked');
    }
    if (resetToken.expires_at < new Date()) {
      console.log('Reset token is expired');
      throw new UnauthorizedException('Reset token is expired');
    }
    if (resetToken.used_at) {
      console.log('Reset token is already used');
      throw new UnauthorizedException('Reset token is already used');
    }
    return resetToken;
  }

  async useResetPasswordToken(token: string) {
    console.log('try to use reset password token');
    const resetToken = await this.checkResetPasswordToken(token);
    resetToken.used_at = new Date();
    await this.resetPasswordRepo.save(resetToken);
    return resetToken.user;
  }
}
