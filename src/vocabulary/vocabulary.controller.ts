import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserVocabularyItemDto } from './dto/create-user-vocabulary-item.dto';
import { VocabularyService } from './vocabulary.service';

@Controller('vocabulary')
export class VocabularyController {
  constructor(
    private readonly vocabularyService: VocabularyService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('my-items')
  async createMyItem(
    @Req() req: Request,
    @Body() body: CreateUserVocabularyItemDto,
  ) {
    try {
      const tokenPayload = this.authService.checkAccessTokenFromRequest(req);
      const user = await this.usersService.findUserByEmail(tokenPayload.email);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return await this.vocabularyService.createUserVocabularyItem(
        user.id,
        body,
      );
    } catch (e) {
      console.log('ERROR:', (e as Error).message);

      if (e instanceof HttpException) {
        throw e;
      }

      throw new HttpException(
        (e as Error)?.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
