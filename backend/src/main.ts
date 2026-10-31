import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import type { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Раздача загруженных файлов портфолио (/uploads/portfolio/<filename>)
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  // Security
  app.use(helmet());
  app.use(cookieParser());

  // Воркэраунд для бага в nginx-конфиге на проде (мы не можем его поправить —
  // nginx управляется хостинг-провайдером, клиенту недоступен): он шлёт
  // "Connection: upgrade" на ВСЕ запросы к апстриму, из-за чего иногда
  // переиспользует keep-alive-соединение между несвязанными запросами и
  // multipart-поля (например categoryId) долетают повреждёнными. Явно
  // говорим клиенту (nginx) закрыть соединение после каждого ответа — тогда
  // переиспользовать его физически нечем.
  //
  // ВАЖНО: httpServer.keepAliveTimeout = 0 (как было раньше) здесь не
  // работает — это НЕ "закрывать сразу", а "никогда не закрывать по
  // таймауту" (отключает проверку, а не включает мгновенное закрытие).
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Connection', 'close');
    next();
  });

  // CORS
  const frontendUrl = configService.get('FRONTEND_URL') || 'http://localhost';
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ElectroMontage API')
    .setDescription('Backend API for ElectroMontage admin panel')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  // setGlobalPrefix выше не подхватывается Swagger автоматически — указываем
  // путь целиком, иначе документация окажется на /docs, а не на /api/docs.
  SwaggerModule.setup('api/docs', app, document);

  // PORT=0 или пустое значение встречаются в окружениях (например, CI) —
  // тогда слушаем стандартный 3001, иначе приложение встаёт на случайный порт.
  const port = Number(configService.get('PORT')) || 3001;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();