import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Language } from '../languages/entities/language.entity';
import { CreateUserVocabularyItemDto } from './dto/create-user-vocabulary-item.dto';
import {
  ConceptImage,
  ConceptImageStatus,
} from './entities/concept-image.entity';
import { ConceptWord } from './entities/concept-word.entity';
import { Concept, ConceptStatus } from './entities/concept.entity';
import {
  UserVocabularyItem,
  UserVocabularyItemStatus,
} from './entities/user-vocabulary-item.entity';
import { Word } from './entities/word.entity';

export interface VocabularyWordResponse {
  id: number;
  languageId: number;
  text: string;
}

export interface VocabularyImageResponse {
  id: number;
  imageUrl: string;
  isPrimary: boolean;
}

export interface UserVocabularyItemResponse {
  id: number;
  userId: number;
  conceptId: number;
  sourceLanguageId: number;
  targetLanguageId: number;
  status: UserVocabularyItemStatus;
  concept: {
    id: number;
    status: ConceptStatus;
    primaryWordId: number | null;
    words: VocabularyWordResponse[];
    images: VocabularyImageResponse[];
  };
}

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

  async createUserVocabularyItem(
    userId: number,
    dto: CreateUserVocabularyItemDto,
  ): Promise<UserVocabularyItemResponse> {
    if (dto.sourceLanguageId === dto.targetLanguageId) {
      throw new BadRequestException(
        'Source and target languages must be different',
      );
    }

    return await this.userVocabularyItemRepository.manager.transaction(
      async (manager) => {
        const [sourceLanguage, targetLanguage] = await Promise.all([
          manager.findOne(Language, {
            where: { id: dto.sourceLanguageId },
          }),
          manager.findOne(Language, {
            where: { id: dto.targetLanguageId },
          }),
        ]);

        if (!sourceLanguage) {
          throw new BadRequestException('Source language not found');
        }

        if (!targetLanguage) {
          throw new BadRequestException('Target language not found');
        }

        const concept = await manager.save(
          Concept,
          manager.create(Concept, {
            created_by_user_id: userId,
            status: ConceptStatus.Private,
          }),
        );

        const sourceWord = await this.findOrCreateWord(manager, {
          languageId: sourceLanguage.id,
          text: dto.sourceText,
        });
        const targetWord = await this.findOrCreateWord(manager, {
          languageId: targetLanguage.id,
          text: dto.targetText,
        });

        await manager.save(ConceptWord, [
          manager.create(ConceptWord, {
            concept_id: concept.id,
            word_id: sourceWord.id,
            created_by_user_id: userId,
            is_primary: false,
          }),
          manager.create(ConceptWord, {
            concept_id: concept.id,
            word_id: targetWord.id,
            created_by_user_id: userId,
            is_primary: true,
          }),
        ]);

        concept.primary_word_id = targetWord.id;
        await manager.save(Concept, concept);

        const images = dto.imageUrl
          ? await this.createConceptImages(manager, {
              conceptId: concept.id,
              userId,
              imageUrl: dto.imageUrl,
              imageSourceUrl: dto.imageSourceUrl,
              imageAltText: dto.imageAltText,
            })
          : [];

        const item = await manager.save(
          UserVocabularyItem,
          manager.create(UserVocabularyItem, {
            user_id: userId,
            concept_id: concept.id,
            source_language_id: sourceLanguage.id,
            target_language_id: targetLanguage.id,
            status: UserVocabularyItemStatus.Active,
          }),
        );

        return this.toUserVocabularyItemResponse({
          item,
          concept,
          words: [sourceWord, targetWord],
          images,
        });
      },
    );
  }

  private async findOrCreateWord(
    manager: EntityManager,
    input: { languageId: number; text: string },
  ): Promise<Word> {
    const text = input.text.trim();
    const normalizedText = this.normalizeWordText(text);
    const existingWord = await manager.findOne(Word, {
      where: {
        language_id: input.languageId,
        normalized_text: normalizedText,
      },
    });

    if (existingWord) return existingWord;

    return await manager.save(
      Word,
      manager.create(Word, {
        language_id: input.languageId,
        text,
        normalized_text: normalizedText,
      }),
    );
  }

  private async createConceptImages(
    manager: EntityManager,
    input: {
      conceptId: number;
      userId: number;
      imageUrl: string;
      imageSourceUrl?: string;
      imageAltText?: string;
    },
  ): Promise<ConceptImage[]> {
    const image = await manager.save(
      ConceptImage,
      manager.create(ConceptImage, {
        concept_id: input.conceptId,
        image_url: input.imageUrl,
        source_url: input.imageSourceUrl ?? null,
        alt_text: input.imageAltText ?? null,
        created_by_user_id: input.userId,
        is_primary: true,
        status: ConceptImageStatus.Private,
      }),
    );

    return [image];
  }

  private normalizeWordText(text: string): string {
    return text.trim().toLowerCase();
  }

  private toUserVocabularyItemResponse(input: {
    item: UserVocabularyItem;
    concept: Concept;
    words: Word[];
    images: ConceptImage[];
  }): UserVocabularyItemResponse {
    return {
      id: input.item.id,
      userId: input.item.user_id,
      conceptId: input.item.concept_id,
      sourceLanguageId: input.item.source_language_id,
      targetLanguageId: input.item.target_language_id,
      status: input.item.status,
      concept: {
        id: input.concept.id,
        status: input.concept.status,
        primaryWordId: input.concept.primary_word_id,
        words: input.words.map((word) => ({
          id: word.id,
          languageId: word.language_id,
          text: word.text,
        })),
        images: input.images.map((image) => ({
          id: image.id,
          imageUrl: image.image_url,
          isPrimary: image.is_primary,
        })),
      },
    };
  }
}
