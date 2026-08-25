import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Language } from '../languages/entities/language.entity';
import { ConceptImage } from './entities/concept-image.entity';
import { ConceptWord } from './entities/concept-word.entity';
import { Concept } from './entities/concept.entity';
import { UserVocabularyItem } from './entities/user-vocabulary-item.entity';
import { Word } from './entities/word.entity';
import { VocabularyController } from './vocabulary.controller';
import { VocabularyService } from './vocabulary.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Language,
      Word,
      Concept,
      ConceptWord,
      ConceptImage,
      UserVocabularyItem,
    ]),
    AuthModule,
  ],
  controllers: [VocabularyController],
  providers: [VocabularyService],
  exports: [VocabularyService],
})
export class VocabularyModule {}
