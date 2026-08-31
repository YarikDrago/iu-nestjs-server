import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserVocabularyItemDto } from './dto/create-user-vocabulary-item.dto';
import { GetUserVocabularyItemsDto } from './dto/get-user-vocabulary-items.dto';
import { UpdateUserVocabularyItemDto } from './dto/update-user-vocabulary-item.dto';
import { VocabularyService } from './vocabulary.service';

@Controller('vocabulary')
export class VocabularyController {
  constructor(
    private readonly vocabularyService: VocabularyService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Get('my-items')
  async getMyItems(
    @Req() req: Request,
    @Query() query: GetUserVocabularyItemsDto,
  ) {
    try {
      const user = await this.getUserFromRequest(req);

      return await this.vocabularyService.getUserVocabularyItems(
        user.id,
        query,
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

  @Post('my-items')
  async createMyItem(
    @Req() req: Request,
    @Body() body: CreateUserVocabularyItemDto,
  ) {
    try {
      const user = await this.getUserFromRequest(req);

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

  @Patch('my-items/:id')
  async updateMyItem(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserVocabularyItemDto,
  ) {
    try {
      const user = await this.getUserFromRequest(req);

      return await this.vocabularyService.updateUserVocabularyItem(
        user.id,
        id,
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

  private async getUserFromRequest(req: Request) {
    const tokenPayload = this.authService.checkAccessTokenFromRequest(req);
    const user = await this.usersService.findUserByEmail(tokenPayload.email);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
