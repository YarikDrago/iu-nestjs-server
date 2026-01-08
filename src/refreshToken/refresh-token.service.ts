import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshToken } from './refresh-token.entity';
import { Repository } from 'typeorm';
import { createHmac } from 'node:crypto';

interface TokenPayload {
  email: string;
  nickname: string;
}

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  generateTokens(payload: TokenPayload) {
    /* Generate access token */
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_ACCESS_SECRET as string,
      {
        expiresIn: '30m', // Set up the token's lifetime
      },
    );

    /* Generate random refresh token */
    const refreshToken = Math.random().toString(36).substring(7);

    return {
      accessToken,
      refreshToken,
    };
  }

  private createRefreshTokenHash(refreshToken: string) {
    return createHmac('sha256', process.env.REFRESH_TOKEN_SECRET!)
      .update(refreshToken)
      .digest('hex');
  }

  async save(userId: number, refreshToken: string) {
    try {
      console.log('try to save refresh token (service)');
      const refreshTokenHash = this.createRefreshTokenHash(refreshToken);
      console.log('refreshTokenHash:', refreshTokenHash);
      /* First, we try to find such a token in the database.
       * If the user is already logged in and is trying to log in from another device,
       * the token will be overwritten and the user will be kicked off the first device.
       * It is worth remembering that spent tokens must be deleted from the database
       * in order not to clog the database. */
      const existing = await this.refreshTokenRepository.findOne({
        where: { user: { id: userId } },
      });

      if (existing) {
        await this.refreshTokenRepository.update(
          { id: existing.id },
          { token: refreshTokenHash },
        );
        return { success: true };
      } else {
        await this.refreshTokenRepository.save({
          user_id: userId,
          token: refreshTokenHash,
          created_at: new Date(),
          expired_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });
        return { success: true };
      }
    } catch (e) {
      console.log('error:', e);
      throw new Error('Error saving refresh token');
    }
  }

  async check(refreshToken: string) {
    console.log('try to check refresh token (service)');
    const refreshTokenHash = this.createRefreshTokenHash(refreshToken);
    const result = await this.refreshTokenRepository.findOne({
      where: { token: refreshTokenHash },
      relations: { user: true }, // TODO make optional
    });
    if (!result) return false;
    // TODO revoke all tokens for current user (cause a replay attack)
    if (result.revoked) {
      console.log('token revoked');
      return false;
    }
    if (result.expired_at < new Date()) return false;
    return result;
  }

  async revoke(refreshToken: string) {
    console.log('try to revoke refresh token (service)');
    const refreshTokenHash = this.createRefreshTokenHash(refreshToken);
    await this.refreshTokenRepository.update(
      { token: refreshTokenHash },
      { revoked: true },
    );
  }

  async delete(refreshToken: string) {
    console.log('try to delete refresh token (service)');
    await this.refreshTokenRepository.delete({ token: refreshToken });
    return { success: true };
  }
}
