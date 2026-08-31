import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
// import { InitialSchema1780963200000 } from './migrations/1780963200000-InitialSchema';
import { CreateGroupMemberRoleNames1781049600000 } from './migrations/1781049600000-CreateGroupMemberRoleNames';
import { AlterMatchesStatusToEnum1781136000000 } from './migrations/1781136000000-AlterMatchesStatusToEnum';
import { AddHidePredictionsToMatches1781222400000 } from './migrations/1781222400000-AddHidePredictionsToMatches';
import { CascadeGroupMemberNotificationSettings1781308800000 } from './migrations/1781308800000-CascadeGroupMemberNotificationSettings';
import { AlterGroupMembersStatusToEnum1781395200000 } from './migrations/1781395200000-AlterGroupMembersStatusToEnum';
import { RemoveMatchNotificationsFromGroupMemberSettings1781481600000 } from './migrations/1781481600000-RemoveMatchNotificationsFromGroupMemberSettings';
import { CreateSportsAndTeams1781568000000 } from './migrations/1781568000000-CreateSportsAndTeams';
import { AddManualUpdateToMatches1781654400000 } from './migrations/1781654400000-AddManualUpdateToMatches';
import { RenameRefreshTokenTokenToTokenHash1781740800000 } from './migrations/1781740800000-RenameRefreshTokenTokenToTokenHash';
import { AddRefreshTokenSessionMetadata1781827200000 } from './migrations/1781827200000-AddRefreshTokenSessionMetadata';
import { AddEmblemToSeasons1781913600000 } from './migrations/1781913600000-AddEmblemToSeasons';
import { CreateLanguageAndWordDictionaries1782000000000 } from './migrations/1782000000000-CreateLanguageAndWordDictionaries';
import { SeedLanguages1782086400000 } from './migrations/1782086400000-SeedLanguages';
import { CreateProductTypes1782172800000 } from './migrations/1782172800000-CreateProductTypes';
import { CreateConcepts1782259200000 } from './migrations/1782259200000-CreateConcepts';
import { CreateVocabularyMvpModel1782345600000 } from './migrations/1782345600000-CreateVocabularyMvpModel';
import { AddConceptMergeFields1782432000000 } from './migrations/1782432000000-AddConceptMergeFields';
import { AddDeletedVocabularyItemStatus1782518400000 } from './migrations/1782518400000-AddDeletedVocabularyItemStatus';
import { createDatabaseOptions } from './database/database-options';

export default createDatabaseOptions().then(
  (options) =>
    new DataSource({
      ...options,
      migrations: [
        // InitialSchema1780963200000, // TODO run this migration after FIFA
        CreateGroupMemberRoleNames1781049600000,
        AlterMatchesStatusToEnum1781136000000,
        AddHidePredictionsToMatches1781222400000,
        CascadeGroupMemberNotificationSettings1781308800000,
        AlterGroupMembersStatusToEnum1781395200000,
        RemoveMatchNotificationsFromGroupMemberSettings1781481600000,
        CreateSportsAndTeams1781568000000,
        AddManualUpdateToMatches1781654400000,
        RenameRefreshTokenTokenToTokenHash1781740800000,
        AddRefreshTokenSessionMetadata1781827200000,
        AddEmblemToSeasons1781913600000,
        CreateLanguageAndWordDictionaries1782000000000,
        SeedLanguages1782086400000,
        CreateProductTypes1782172800000,
        CreateConcepts1782259200000,
        CreateVocabularyMvpModel1782345600000,
        AddConceptMergeFields1782432000000,
        AddDeletedVocabularyItemStatus1782518400000,
      ],
      // extra: {
      //   initSql: "SET time_zone = '+00:00'",
      // },
    }),
);
