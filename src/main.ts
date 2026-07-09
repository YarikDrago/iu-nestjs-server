import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { TournamentsService } from './tournaments/services/tournaments.service';
import { TournamentsMatchesService } from './tournaments/services/tournaments_matches.service';
import { TournamentNotificationService } from './tournaments/services/tournament_notification.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Разрешаем запросы с Next.js
  app.enableCors({
    origin: [
      'http://localhost:6600',
      'http://localhost:3000',
      'http://uliantcev.ru',
      'https://uliantcev.ru',
    ], // адрес вашего Next.js
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'HEAD', 'OPTIONS'],
    credentials: true,
  });

  const port = Number.parseInt(process.env.PORT ?? '', 10) || 4000;
  await app.listen(port);
  console.log(`NestJS server running on http://localhost:${port}`);

  const tournamentsService = app.get(TournamentsService);
  const tournamentsMatchesService = app.get(TournamentsMatchesService);
  const tournamentNotificationService = app.get(TournamentNotificationService);

  // --- Serial job queue (one DB-heavy job at a time) ---
  let chain: Promise<void> = Promise.resolve();

  const enqueue = (jobName: string, job: () => Promise<void>): void => {
    chain = chain
      .then(async () => {
        try {
          await job();
        } catch (e) {
          console.error(`[${jobName}] failed:`, e);
        }
      })
      .catch((e) => {
        // Protect the chain itself from being "broken" by an unexpected error.
        console.error(`[${jobName}] chain error:`, e);
      });
  };

  // Coalesce flags: do not enqueue the same job again if it's already queued/running.
  let matchesQueuedOrRunning = false;
  let seasonsQueuedOrRunning = false;
  let predictionRemindersQueuedOrRunning = false;

  const scheduleMatchesUpdate = (): void => {
    if (matchesQueuedOrRunning) return;
    matchesQueuedOrRunning = true;

    enqueue('updateMatchesOfCompetitions', async () => {
      try {
        await tournamentsMatchesService.updateMatchesOfCompetitions();
      } finally {
        matchesQueuedOrRunning = false;
      }
    });
  };

  const scheduleSeasonsUpdate = (): void => {
    if (seasonsQueuedOrRunning) return;
    seasonsQueuedOrRunning = true;

    enqueue('updateSeasonsOfCompetitions', async () => {
      try {
        await tournamentsService.updateSeasonsOfCompetitions();
      } finally {
        seasonsQueuedOrRunning = false;
      }
    });
  };

  const schedulePredictionReminders = (): void => {
    console.log('reminder start');
    if (predictionRemindersQueuedOrRunning) return;
    predictionRemindersQueuedOrRunning = true;

    enqueue('sendPredictionReminders', async () => {
      try {
        await tournamentNotificationService.sendPredictionReminders();
      } finally {
        predictionRemindersQueuedOrRunning = false;
      }
    });
  };

  // --- Timers (non-async callbacks => no-misused-promises) ---
  setInterval(() => {
    scheduleMatchesUpdate();
  }, 60 * 1000);

  setInterval(
    () => {
      scheduleSeasonsUpdate();
    },
    24 * 60 * 60 * 1000,
  );

  setInterval(
    () => {
      schedulePredictionReminders();
    },
    30 * 60 * 1000,
  );

  // Optionally kick off first runs on startup:
  // scheduleMatchesUpdate();
  // scheduleSeasonsUpdate();
}
bootstrap();
