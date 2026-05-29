import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser') as (options?: import('cookie-parser').CookieParseOptions) => import('express').RequestHandler;
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Sécurité HTTP
  app.use(helmet());

  // Cookies (requis pour le refresh token httpOnly)
  app.use(cookieParser());

  // CORS — autorise les credentials (cookie refresh_token)
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  // Validation globale des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Documentation Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('API Facturation Lussier')
    .setDescription("Documentation de l'API de facturation")
    .setVersion('0.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  Logger.log(`API prête sur http://localhost:${port} (docs: /api/docs)`, 'Bootstrap');
}

void bootstrap();
