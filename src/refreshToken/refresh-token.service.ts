import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshToken } from './refresh-token.entity';
import { Repository } from 'typeorm';

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
    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET as string,
      {
        expiresIn: '30d', // Set up the token's lifetime
      },
    );
    return {
      accessToken,
      refreshToken,
    };
  }

  async save(userId: number, refreshToken: string) {
    console.log('try to save refresh token (service)');
    /** First, we try to find such a token in the database.
     * If the user is already logged in and is trying to log in from another device,
     * the token will be overwritten and the user will be kicked off the first device.
     * It is worth remembering that spent tokens must be deleted from the database
     * in order not to clog the database. */
    const existing = await this.refreshTokenRepository.findOne({
      where: { user_id: userId },
    });

    if (existing) {
      await this.refreshTokenRepository.update(
        { id: existing.id },
        { token: refreshToken },
      );
      return { success: true };
    } else {
      await this.refreshTokenRepository.save({
        user_id: userId,
        token: refreshToken,
      });
      return { success: true };
    }
  }
}
