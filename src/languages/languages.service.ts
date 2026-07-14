import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLanguageDto } from './dto/create-language.dto';
import { Language } from './entities/language.entity';

@Injectable()
export class LanguagesService {
  constructor(
    @InjectRepository(Language)
    private readonly languageRepository: Repository<Language>,
  ) {}

  async createLanguage(dto: CreateLanguageDto): Promise<Language> {
    const existingLanguage = await this.languageRepository.findOne({
      where: { code: dto.code },
    });

    if (existingLanguage) {
      throw new BadRequestException('Language already exists');
    }

    const language = this.languageRepository.create({
      code: dto.code,
      name: dto.name,
    });

    return await this.languageRepository.save(language);
  }
}
