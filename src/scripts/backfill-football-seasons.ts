import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TournamentsService } from '../tournaments/services/tournaments.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const tournamentsService = app.get(TournamentsService);
    const before = await tournamentsService.getTournamentsStats();
    console.log('Tournaments before backfill:', before);

    const result = await tournamentsService.backfillSeasonsOfAllCompetitions(5);

    console.log('Football seasons backfill finished:', result);
  } finally {
    await app.close();
  }
}

void bootstrap();
