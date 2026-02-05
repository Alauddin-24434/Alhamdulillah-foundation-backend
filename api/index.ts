import 'ts-node/register';
import 'tsconfig-paths/register';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ValidationPipe, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from 'src/app.module';

const server = express();
let cachedServer: any;
const logger = new Logger('VercelHandler');

async function createNestServer() {
  logger.log('Creating NestJS server...');
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
    { logger: ['log', 'error', 'warn', 'debug', 'verbose'] }
  );

  const configService = app.get(ConfigService);

  app.use(cookieParser());
  app.use(helmet());

  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL') || 'http://localhost:3000',
    credentials: true,
  });

  app.setGlobalPrefix('api', { exclude: ['/'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        const result = errors.map((error) => ({
          property: error.property,
          message: error.constraints ? Object.values(error.constraints)[0] : 'Invalid value',
        }));
        return new BadRequestException(result);
      },
    })
  );

  await app.init();
  logger.log('NestJS server created successfully!');
  return server;
}

export default async function handler(req: Request, res: Response) {
  logger.log(`Incoming request: ${req.method} ${req.url}`);
  if (!cachedServer) {
    logger.log('No cached server found. Initializing...');
    cachedServer = await createNestServer();
  } else {
    logger.log('Using cached server instance.');
  }

  try {
    cachedServer(req, res);
  } catch (err) {
    logger.error('Error handling request', err);
    res.status(500).send('Internal Server Error');
  }
}
