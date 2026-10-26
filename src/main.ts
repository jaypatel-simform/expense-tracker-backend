import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  configureApp(app);
  app.enableCors({
    origin: (config.get<string>('CORS_ORIGIN') ?? '')
      .split(',')
      .map((o) => o.trim()),
  });
  app.enableShutdownHooks();
  await app.listen(config.get<number>('PORT') ?? 3000);
}
bootstrap();
