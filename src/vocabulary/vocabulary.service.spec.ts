import { BadRequestException } from '@nestjs/common';
import { Language } from '../languages/entities/language.entity';
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
import { VocabularyService } from './vocabulary.service';

class InMemoryVocabularyManager {
  languages: Language[] = [];
  words: Word[] = [];
  concepts: Concept[] = [];
  conceptWords: ConceptWord[] = [];
  conceptImages: ConceptImage[] = [];
  userVocabularyItems: UserVocabularyItem[] = [];

  private ids = new Map<unknown, number>();

  async transaction<T>(
    callback: (manager: InMemoryVocabularyManager) => Promise<T>,
  ): Promise<T> {
    return await callback(this);
  }

  create<T>(_entity: new () => T, payload: Partial<T>): T {
    return payload as T;
  }

  /**
   * Finds one record by options (manager.findOne)
   */
  async findOne<T>(
    entity: new () => T,
    options: { where: Record<string, unknown> },
  ): Promise<T | null> {
    const collection = this.getCollection(entity);
    const record = collection.find((item) =>
      Object.entries(options.where).every(
        ([key, value]) => item[key] === value,
      ),
    );

    return (record as T | undefined) ?? null;
  }

  async save<T>(entity: new () => T, payload: T | T[]): Promise<T | T[]> {
    if (Array.isArray(payload)) {
      return await Promise.all(
        payload.map((item) => this.saveOne(entity, item)),
      );
    }

    return await this.saveOne(entity, payload);
  }

  seedLanguage(id: number, code: string): Language {
    const language = {
      id,
      code,
      name: code.toUpperCase(),
    } as Language;
    this.languages.push(language);
    return language;
  }

  seedWord(id: number, languageId: number, text: string): Word {
    const word = {
      id,
      language_id: languageId,
      text,
      normalized_text: text.trim().toLowerCase(),
    } as Word;
    this.words.push(word);
    this.ids.set(Word, Math.max(this.ids.get(Word) ?? 0, id));
    return word;
  }

  private async saveOne<T>(entity: new () => T, payload: T): Promise<T> {
    const collection = this.getCollection(entity);
    const item = payload as Record<string, unknown>;

    if (!item.id) {
      item.id = this.nextId(entity);
      collection.push(item);
      return item as T;
    }

    const existingIndex = collection.findIndex(
      (record) => record.id === item.id,
    );

    if (existingIndex >= 0) {
      collection[existingIndex] = item;
    } else {
      collection.push(item);
    }

    return item as T;
  }

  private nextId(entity: unknown): number {
    const next = (this.ids.get(entity) ?? 0) + 1;
    this.ids.set(entity, next);
    return next;
  }

  private getCollection(entity: unknown): Array<Record<string, unknown>> {
    if (entity === Language)
      return this.languages as unknown as Array<Record<string, unknown>>;
    if (entity === Word)
      return this.words as unknown as Array<Record<string, unknown>>;
    if (entity === Concept)
      return this.concepts as unknown as Array<Record<string, unknown>>;
    if (entity === ConceptWord)
      return this.conceptWords as unknown as Array<Record<string, unknown>>;
    if (entity === ConceptImage)
      return this.conceptImages as unknown as Array<Record<string, unknown>>;
    if (entity === UserVocabularyItem) {
      return this.userVocabularyItems as unknown as Array<
        Record<string, unknown>
      >;
    }

    throw new Error('Unsupported entity');
  }
}

describe('VocabularyService', () => {
  let manager: InMemoryVocabularyManager;
  let service: VocabularyService;

  beforeEach(() => {
    manager = new InMemoryVocabularyManager();
    manager.seedLanguage(1, 'ru');
    manager.seedLanguage(2, 'en');

    service = new VocabularyService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { manager } as never,
    );
  });

  it('creates a private concept with two concept words and a user vocabulary item', async () => {
    const result = await service.createUserVocabularyItem(10, {
      sourceLanguageId: 1,
      targetLanguageId: 2,
      sourceText: ' Клевый ',
      targetText: ' Cool ',
    });

    expect(manager.concepts).toHaveLength(1);
    expect(manager.concepts[0].status).toBe(ConceptStatus.Private);
    expect(manager.concepts[0].primary_word_id).toBe(manager.words[1].id);

    expect(manager.words).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          language_id: 1,
          text: 'Клевый',
          normalized_text: 'клевый',
        }),
        expect.objectContaining({
          language_id: 2,
          text: 'Cool',
          normalized_text: 'cool',
        }),
      ]),
    );
    expect(manager.conceptWords).toHaveLength(2);
    expect(manager.userVocabularyItems).toHaveLength(1);
    expect(result).toEqual({
      id: manager.userVocabularyItems[0].id,
      userId: 10,
      conceptId: manager.concepts[0].id,
      sourceLanguageId: 1,
      targetLanguageId: 2,
      status: UserVocabularyItemStatus.Active,
      concept: {
        id: manager.concepts[0].id,
        status: ConceptStatus.Private,
        primaryWordId: manager.words[1].id,
        words: [
          { id: manager.words[0].id, languageId: 1, text: 'Клевый' },
          { id: manager.words[1].id, languageId: 2, text: 'Cool' },
        ],
        images: [],
      },
    });
  });

  it('reuses existing words by language and normalized text', async () => {
    const existingWord = manager.seedWord(50, 2, 'cool');

    await service.createUserVocabularyItem(10, {
      sourceLanguageId: 1,
      targetLanguageId: 2,
      sourceText: 'классный',
      targetText: ' COOL ',
    });

    expect(manager.words.filter((word) => word.language_id === 2)).toEqual([
      existingWord,
    ]);
    expect(manager.conceptWords).toContainEqual(
      expect.objectContaining({ word_id: existingWord.id }),
    );
  });

  it('rejects equal source and target languages', async () => {
    await expect(
      service.createUserVocabularyItem(10, {
        sourceLanguageId: 1,
        targetLanguageId: 1,
        sourceText: 'классный',
        targetText: 'cool',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(manager.concepts).toHaveLength(0);
  });

  it('rejects missing languages', async () => {
    await expect(
      service.createUserVocabularyItem(10, {
        sourceLanguageId: 1,
        targetLanguageId: 999,
        sourceText: 'классный',
        targetText: 'cool',
      }),
    ).rejects.toThrow('Target language not found');
  });

  it('creates an optional private primary image', async () => {
    const result = await service.createUserVocabularyItem(10, {
      sourceLanguageId: 1,
      targetLanguageId: 2,
      sourceText: 'классный',
      targetText: 'cool',
      imageUrl: 'https://example.com/cool.jpg',
      imageSourceUrl: 'https://example.com',
      imageAltText: 'Cool sunglasses',
    });

    expect(manager.conceptImages).toEqual([
      expect.objectContaining({
        concept_id: manager.concepts[0].id,
        image_url: 'https://example.com/cool.jpg',
        source_url: 'https://example.com',
        alt_text: 'Cool sunglasses',
        created_by_user_id: 10,
        is_primary: true,
        status: ConceptImageStatus.Private,
      }),
    ]);
    expect(result.concept.images).toEqual([
      {
        id: manager.conceptImages[0].id,
        imageUrl: 'https://example.com/cool.jpg',
        isPrimary: true,
      },
    ]);
  });
});
