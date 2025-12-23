import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Разрешаем запросы с Next.js
  app.enableCors({
    origin: 'http://localhost:6600', // адрес вашего Next.js
    methods: ['GET', 'POST'],
  });

  await app.listen(4000);
  console.log('NestJS server running on http://localhost:4000');
}
bootstrap();
