import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshToken } from './refresh-token.entity';
import { Repository } from 'typeorm';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface TokenPayload {
  email: string;
  nickname: string;
}

export interface SaveRefreshTokenOptions {
  deviceId?: string;
  userAgent?: string | null;
  ipAddress?: string | null;
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
    const refreshToken = randomBytes(64).toString('hex');

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

  private createRefreshTokenExpirationDate() {
    return new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  }

  async save(
    userId: number,
    refreshToken: string,
    options: SaveRefreshTokenOptions = {},
  ) {
    try {
      console.log('try to save refresh token (service)');
      const refreshTokenHash = this.createRefreshTokenHash(refreshToken);
      const deviceId = options.deviceId ?? randomUUID();
      console.log('refreshTokenHash:', refreshTokenHash);

      const existing = await this.refreshTokenRepository.findOne({
        where: { user_id: userId, device_id: deviceId },
      });

      if (existing) {
        await this.refreshTokenRepository.update(
          { id: existing.id },
          {
            token_hash: refreshTokenHash,
            user_agent: options.userAgent ?? null,
            ip_address: options.ipAddress ?? null,
            last_used_at: new Date(),
            expired_at: this.createRefreshTokenExpirationDate(),
            revoked: false,
          },
        );
      } else {
        await this.refreshTokenRepository.save({
          user_id: userId,
          token_hash: refreshTokenHash,
          device_id: deviceId,
          user_agent: options.userAgent ?? null,
          ip_address: options.ipAddress ?? null,
          created_at: new Date(),
          last_used_at: new Date(),
          expired_at: this.createRefreshTokenExpirationDate(),
          revoked: false,
        });
      }

      return { success: true, deviceId };
    } catch (e) {
      console.log('error:', e);
      throw new Error('Error saving refresh token');
    }
  }

  async rotate(tokenRecord: RefreshToken, refreshToken: string) {
    const refreshTokenHash = this.createRefreshTokenHash(refreshToken);
    const deviceId = tokenRecord.device_id ?? randomUUID();

    await this.refreshTokenRepository.update(
      { id: tokenRecord.id },
      {
        token_hash: refreshTokenHash,
        device_id: deviceId,
        last_used_at: new Date(),
        expired_at: this.createRefreshTokenExpirationDate(),
        revoked: false,
      },
    );

    return { success: true, deviceId };
  }

  async check(refreshToken: string) {
    console.log('try to check refresh token (service):', refreshToken);
    const refreshTokenHash = this.createRefreshTokenHash(refreshToken);
    const result = await this.refreshTokenRepository.findOne({
      where: { token_hash: refreshTokenHash },
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
      { token_hash: refreshTokenHash },
      { revoked: true },
    );
  }

  async delete(refreshToken: string) {
    console.log('try to delete refresh token (service)');
    const refreshTokenHash = this.createRefreshTokenHash(refreshToken);
    await this.refreshTokenRepository.delete({ token_hash: refreshTokenHash });
    return { success: true };
  }

  async deleteAllTokensForUserId(userId: number) {
    console.log('try to delete all tokens for user (service):', userId);
    await this.refreshTokenRepository.delete({ user_id: userId });
  }
}
