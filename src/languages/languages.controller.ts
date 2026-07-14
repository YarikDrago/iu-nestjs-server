import { Body, Controller, Post } from '@nestjs/common';
import { CreateLanguageDto } from './dto/create-language.dto';
import { LanguagesService } from './languages.service';

@Controller('languages')
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @Post()
  async createLanguage(@Body() body: CreateLanguageDto) {
    return await this.languagesService.createLanguage(body);
  }
}
