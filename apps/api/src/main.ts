import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173' });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('API Facturation Lussier')
    .setDescription("Documentation de l'API de facturation")
    .setVersion('0.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
  console.log(`API prête sur http://localhost:${port} (docs: /api/docs)`);
}

void bootstrap();
