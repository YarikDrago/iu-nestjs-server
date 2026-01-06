import { Injectable } from '@nestjs/common';
import { RefreshTokenService } from '../refreshToken/refresh-token.service';

@Injectable()
export class AuthService {
  constructor(private readonly refreshTokenService: RefreshTokenService) {

  }
}
