import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ValidationPipe,
  VersioningType,
  ClassSerializerInterceptor,
  Logger,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const port = Number(process.env.PORT ?? 3000);
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  app.enableCors({
    origin: '*',
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
        excludeExtraneousValues: false,
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Wasel Palestine API')
    .setDescription('API documentation for route estimation and other modules')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  try {
    await app.listen(port);
    logger.log(`Server is listening on http://localhost:${port}`);
  } catch (error: any) {
    if (error?.code === 'EADDRINUSE') {
      logger.error(
        `Port ${port} is already in use. Stop the existing process or set PORT to a different value before starting the server.`,
      );
      await app.close();
      process.exit(1);
    }

    throw error;
  }
}
bootstrap();
