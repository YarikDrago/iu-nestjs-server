import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { UserVocabularyItemStatus } from './entities/user-vocabulary-item.entity';
import { VocabularyController } from './vocabulary.controller';
import { VocabularyService } from './vocabulary.service';

describe('VocabularyController', () => {
  let authService: Pick<AuthService, 'checkAccessTokenFromRequest'>;
  let usersService: Pick<UsersService, 'findUserByEmail'>;
  let vocabularyService: Pick<VocabularyService, 'createUserVocabularyItem'>;
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
    };
    controller = new VocabularyController(
      vocabularyService as VocabularyService,
      authService as AuthService,
      usersService as UsersService,
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
});
