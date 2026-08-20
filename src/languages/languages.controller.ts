import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { CreateLanguageDto } from './dto/create-language.dto';
import { LanguagesService } from './languages.service';

@Controller('languages')
export class LanguagesController {
  constructor(
    private readonly languagesService: LanguagesService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async getLanguages() {
    return await this.languagesService.getLanguages();
  }

  @Post()
  async createLanguage(@Req() req: Request, @Body() body: CreateLanguageDto) {
    await this.authService.checkUserRolesByRequest(req, ['admin']);

    return await this.languagesService.createLanguage(body);
  }
}
