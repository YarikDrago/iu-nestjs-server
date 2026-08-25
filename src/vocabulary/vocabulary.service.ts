import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from '../languages/entities/language.entity';
import { ConceptImage } from './entities/concept-image.entity';
import { ConceptWord } from './entities/concept-word.entity';
import { Concept } from './entities/concept.entity';
import { UserVocabularyItem } from './entities/user-vocabulary-item.entity';
import { Word } from './entities/word.entity';

@Injectable()
export class VocabularyService {
  constructor(
    @InjectRepository(Language)
    private readonly languageRepository: Repository<Language>,
    @InjectRepository(Word)
    private readonly wordRepository: Repository<Word>,
    @InjectRepository(Concept)
    private readonly conceptRepository: Repository<Concept>,
    @InjectRepository(ConceptWord)
    private readonly conceptWordRepository: Repository<ConceptWord>,
    @InjectRepository(ConceptImage)
    private readonly conceptImageRepository: Repository<ConceptImage>,
    @InjectRepository(UserVocabularyItem)
    private readonly userVocabularyItemRepository: Repository<UserVocabularyItem>,
  ) {}
}
