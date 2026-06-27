import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import serverlessExpress from '@vendia/serverless-express';
import express from 'express';
import type { Handler } from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggerService } from './common/services/logger.service';
import { API_PREFIX } from '@acs/shared';
import { resolveCorsOrigins } from './config/cors.util';

type ServerlessHandler = Handler;

let cachedServer: ServerlessHandler | undefined;

function configureBigIntJson(): void {
  if (!Object.getOwnPropertyDescriptor(BigInt.prototype, 'toJSON')) {
    Object.defineProperty(BigInt.prototype, 'toJSON', {
      value: function (this: bigint) {
        return this.toString();
      },
      configurable: true,
      writable: true,
    });
  }
}

export async function createApp(
  expressApp: express.Express = express(),
): Promise<INestApplication> {
  configureBigIntJson();

  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const allowedOrigins = resolveCorsOrigins();

  app.setGlobalPrefix(API_PREFIX);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(app.get(LoggerService)),
    new TransformInterceptor(),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI Content Studio API')
    .setDescription('Production API for AI content automation platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.init();

  if (process.env.VERCEL !== '1') {
    const port = configService.get<number>('app.port') ?? 4000;
    console.log(`API configured for http://localhost:${port}${API_PREFIX}`);
    console.log(`Swagger docs: http://localhost:${port}/docs`);
  }

  return app;
}

export async function getServerlessHandler(): Promise<ServerlessHandler> {
  if (!cachedServer) {
    const expressApp = express();
    await createApp(expressApp);
    cachedServer = serverlessExpress({ app: expressApp }) as ServerlessHandler;
  }
  return cachedServer;
}
