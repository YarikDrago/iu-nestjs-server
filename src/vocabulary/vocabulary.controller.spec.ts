import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { UserVocabularyItemStatus } from './entities/user-vocabulary-item.entity';
import { VocabularyController } from './vocabulary.controller';
import { VocabularyService } from './vocabulary.service';

describe('VocabularyController', () => {
  let authService: Pick<AuthService, 'checkAccessTokenFromRequest'>;
  let usersService: Pick<UsersService, 'findUserByEmail'>;
  let vocabularyService: Pick<
    VocabularyService,
    | 'createUserVocabularyItem'
    | 'getUserVocabularyItems'
    | 'updateUserVocabularyItem'
    | 'updateUserVocabularyItemContent'
    | 'deleteUserVocabularyItem'
  >;
  let controller: VocabularyController;

  beforeEach(() => {
    authService = {
      checkAccessTokenFromRequest: jest.fn(),
    };
    usersService = {
      findUserByEmail: jest.fn(),
    };
    vocabularyService = {
      createUserVocabularyItem: jest.fn(),
      getUserVocabularyItems: jest.fn(),
      updateUserVocabularyItem: jest.fn(),
      updateUserVocabularyItemContent: jest.fn(),
      deleteUserVocabularyItem: jest.fn(),
    };
    controller = new VocabularyController(
      vocabularyService as VocabularyService,
      authService as AuthService,
      usersService as UsersService,
    );
  });

  it('gets vocabulary items for the authenticated user', async () => {
    jest.mocked(authService.checkAccessTokenFromRequest).mockReturnValueOnce({
      email: 'user@example.com',
      nickname: 'user',
    });
    jest.mocked(usersService.findUserByEmail).mockResolvedValueOnce({
      id: 10,
      email: 'user@example.com',
      nickname: 'user',
    } as never);
    jest
      .mocked(vocabularyService.getUserVocabularyItems)
      .mockResolvedValueOnce([
        {
          id: 1,
          userId: 10,
          conceptId: 2,
          sourceLanguageId: 1,
          targetLanguageId: 2,
          status: UserVocabularyItemStatus.Active,
          concept: {
            id: 2,
            status: 'private' as never,
            primaryWordId: 3,
            words: [],
            images: [],
          },
        },
      ]);

    const query = {
      sourceLanguageId: 1,
      targetLanguageId: 2,
      status: UserVocabularyItemStatus.Active,
    };

    await expect(controller.getMyItems({} as never, query)).resolves.toEqual([
      {
        id: 1,
        userId: 10,
        conceptId: 2,
        sourceLanguageId: 1,
        targetLanguageId: 2,
        status: UserVocabularyItemStatus.Active,
        concept: {
          id: 2,
          status: 'private',
          primaryWordId: 3,
          words: [],
          images: [],
        },
      },
    ]);
    expect(vocabularyService.getUserVocabularyItems).toHaveBeenCalledWith(
      10,
      query,
    );
  });

  it('fails when the request is unauthenticated', async () => {
    jest
      .mocked(authService.checkAccessTokenFromRequest)
      .mockImplementationOnce(() => {
        throw new UnauthorizedException('Access token is invalid');
      });

    await expect(
      controller.createMyItem({} as never, {
        sourceLanguageId: 1,
        targetLanguageId: 2,
        sourceText: 'классный',
        targetText: 'cool',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(vocabularyService.createUserVocabularyItem).not.toHaveBeenCalled();
  });

  it('creates a vocabulary item for the authenticated user', async () => {
    jest.mocked(authService.checkAccessTokenFromRequest).mockReturnValueOnce({
      email: 'user@example.com',
      nickname: 'user',
    });
    jest.mocked(usersService.findUserByEmail).mockResolvedValueOnce({
      id: 10,
      email: 'user@example.com',
      nickname: 'user',
    } as never);
    jest
      .mocked(vocabularyService.createUserVocabularyItem)
      .mockResolvedValueOnce({
        id: 1,
        userId: 10,
        conceptId: 2,
        sourceLanguageId: 1,
        targetLanguageId: 2,
        status: UserVocabularyItemStatus.Active,
        concept: {
          id: 2,
          status: 'private' as never,
          primaryWordId: 3,
          words: [],
          images: [],
        },
      });

    const body = {
      sourceLanguageId: 1,
      targetLanguageId: 2,
      sourceText: 'классный',
      targetText: 'cool',
    };

    await expect(controller.createMyItem({} as never, body)).resolves.toEqual({
      id: 1,
      userId: 10,
      conceptId: 2,
      sourceLanguageId: 1,
      targetLanguageId: 2,
      status: UserVocabularyItemStatus.Active,
      concept: {
        id: 2,
        status: 'private',
        primaryWordId: 3,
        words: [],
        images: [],
      },
    });
    expect(vocabularyService.createUserVocabularyItem).toHaveBeenCalledWith(
      10,
      body,
    );
  });

  it('updates a vocabulary item for the authenticated user', async () => {
    jest.mocked(authService.checkAccessTokenFromRequest).mockReturnValueOnce({
      email: 'user@example.com',
      nickname: 'user',
    });
    jest.mocked(usersService.findUserByEmail).mockResolvedValueOnce({
      id: 10,
      email: 'user@example.com',
      nickname: 'user',
    } as never);
    jest
      .mocked(vocabularyService.updateUserVocabularyItem)
      .mockResolvedValueOnce({
        id: 1,
        userId: 10,
        conceptId: 2,
        sourceLanguageId: 1,
        targetLanguageId: 2,
        status: UserVocabularyItemStatus.Archived,
        concept: {
          id: 2,
          status: 'private' as never,
          primaryWordId: 3,
          words: [],
          images: [],
        },
      });

    const body = {
      status: UserVocabularyItemStatus.Archived,
    };

    await expect(
      controller.updateMyItem({} as never, 1, body),
    ).resolves.toEqual({
      id: 1,
      userId: 10,
      conceptId: 2,
      sourceLanguageId: 1,
      targetLanguageId: 2,
      status: UserVocabularyItemStatus.Archived,
      concept: {
        id: 2,
        status: 'private',
        primaryWordId: 3,
        words: [],
        images: [],
      },
    });
    expect(vocabularyService.updateUserVocabularyItem).toHaveBeenCalledWith(
      10,
      1,
      body,
    );
  });

  it('deletes a vocabulary item for the authenticated user', async () => {
    jest.mocked(authService.checkAccessTokenFromRequest).mockReturnValueOnce({
      email: 'user@example.com',
      nickname: 'user',
    });
    jest.mocked(usersService.findUserByEmail).mockResolvedValueOnce({
      id: 10,
      email: 'user@example.com',
      nickname: 'user',
    } as never);
    jest
      .mocked(vocabularyService.deleteUserVocabularyItem)
      .mockResolvedValueOnce({
        id: 1,
        userId: 10,
        conceptId: 2,
        sourceLanguageId: 1,
        targetLanguageId: 2,
        status: UserVocabularyItemStatus.Deleted,
        concept: {
          id: 2,
          status: 'private' as never,
          primaryWordId: 3,
          words: [],
          images: [],
        },
      });

    await expect(controller.deleteMyItem({} as never, 1)).resolves.toEqual({
      id: 1,
      userId: 10,
      conceptId: 2,
      sourceLanguageId: 1,
      targetLanguageId: 2,
      status: UserVocabularyItemStatus.Deleted,
      concept: {
        id: 2,
        status: 'private',
        primaryWordId: 3,
        words: [],
        images: [],
      },
    });
    expect(vocabularyService.deleteUserVocabularyItem).toHaveBeenCalledWith(
      10,
      1,
    );
  });

  it('updates vocabulary item content for the authenticated user', async () => {
    jest.mocked(authService.checkAccessTokenFromRequest).mockReturnValueOnce({
      email: 'user@example.com',
      nickname: 'user',
    });
    jest.mocked(usersService.findUserByEmail).mockResolvedValueOnce({
      id: 10,
      email: 'user@example.com',
      nickname: 'user',
    } as never);
    jest
      .mocked(vocabularyService.updateUserVocabularyItemContent)
      .mockResolvedValueOnce({
        id: 1,
        userId: 10,
        conceptId: 2,
        sourceLanguageId: 2,
        targetLanguageId: 1,
        status: UserVocabularyItemStatus.Active,
        concept: {
          id: 2,
          status: 'private' as never,
          primaryWordId: 4,
          words: [
            { id: 3, languageId: 2, text: 'cool' },
            { id: 4, languageId: 1, text: 'nice' },
          ],
          images: [],
        },
      });

    const body = {
      sourceLanguageId: 2,
      targetLanguageId: 1,
      sourceText: 'cool',
      targetText: 'nice',
    };

    await expect(
      controller.updateMyItemContent({} as never, 1, body),
    ).resolves.toEqual({
      id: 1,
      userId: 10,
      conceptId: 2,
      sourceLanguageId: 2,
      targetLanguageId: 1,
      status: UserVocabularyItemStatus.Active,
      concept: {
        id: 2,
        status: 'private',
        primaryWordId: 4,
        words: [
          { id: 3, languageId: 2, text: 'cool' },
          { id: 4, languageId: 1, text: 'nice' },
        ],
        images: [],
      },
    });
    expect(
      vocabularyService.updateUserVocabularyItemContent,
    ).toHaveBeenCalledWith(10, 1, body);
  });
});
