const express = require('express');
const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { ValidationPipe, BadRequestException, Logger } = require('@nestjs/common');
const { ConfigService } = require('@nestjs/config');
const { AppModule } = require('../dist/app.module'); // compiled JS থেকে import

const server = express();
let cachedServer;
const logger = new Logger('VercelHandler');

async function createNestServer() {
  logger.log('Creating NestJS server...');
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  app.use(cookieParser());
  app.use(helmet());

  app.enableCors({
    origin: configService.get('FRONTEND_URL') || 'http://localhost:3000',
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
          message: error.constraints
            ? Object.values(error.constraints)[0]
            : 'Invalid value',
        }));
        return new BadRequestException(result);
      },
    })
  );

  await app.init();
  logger.log('NestJS server created successfully!');
  return server;
}

module.exports = async function handler(req, res) {
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
};
