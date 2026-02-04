import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import bodyParser from 'body-parser';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn'], // 🔥 clean output
  });
  

  const configService = app.get(ConfigService);
app.useStaticAssets(join(__dirname, '..', 'public'));

  // 🔥 Stripe Webhook RAW body
  app.use(
    '/api/payments/stripe/webhook',
    bodyParser.raw({ type: 'application/json' }),
  );
  app.use(cookieParser());
  app.use(helmet());

  app.enableCors({
    origin:
      configService.get<string>('FRONTEND_URL') || 'http://localhost:3000',
    credentials: true,
  });

 app.setGlobalPrefix('api', {
  exclude: ['/', ],
});


  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const result = errors.map((error) => ({
          property: error.property,
          message: error.constraints
            ? Object.values(error.constraints)[0]
            : 'Invalid value',
        }));
        console.error('Validation Errors:', JSON.stringify(result, null, 2));
        return new BadRequestException(result);
      },
    }),
  );
 
  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Alhamdulillah Foundation API')
    .setDescription('The API documentation for Alhamdulillah Foundation backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get<number>('PORT') || 5000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
  console.log(`📜 Documentation available at: http://localhost:${port}/docs`);
}
bootstrap();