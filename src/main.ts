import { NestFactory } from '@nestjs/core';
import { BadRequestException, Logger, ValidationError, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CorsConfig, NestConfig, SwaggerConfig } from './shared/config/config.interface';
import cookieParser = require('cookie-parser');
import basicAuth = require('express-basic-auth');

function flattenValidationErrors(errors: ValidationError[], parent = ''): { field: string; constraints: Record<string, string> }[] {
  const result: { field: string; constraints: Record<string, string> }[] = [];
  for (const err of errors) {
    const field = parent ? `${parent}.${err.property}` : err.property;
    if (err.constraints) result.push({ field, constraints: err.constraints });
    if (err.children?.length) result.push(...flattenValidationErrors(err.children, field));
  }
  return result;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const fields = flattenValidationErrors(errors);
        const messages = fields.flatMap((f) => Object.values(f.constraints ?? {}));
        return new BadRequestException({ message: messages, details: { fields } });
      },
    }),
  );

  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const nestConfig = config.getOrThrow<NestConfig>('nest');
  const corsConfig = config.getOrThrow<CorsConfig>('cors');
  const swaggerConfig = config.getOrThrow<SwaggerConfig>('swagger');

  if (corsConfig.enabled) {
    app.enableCors({
      origin: corsConfig.corsOrigins,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type, Accept, Authorization',
      credentials: true,
      optionsSuccessStatus: 204,
    });
  }

  if (swaggerConfig.enabled) {
    app.use(
      `/${swaggerConfig.path}`,
      basicAuth({
        challenge: true,
        users: {
          [process.env.SWAGGER_USER || 'admin']: process.env.SWAGGER_PASSWORD || 'admin',
        },
      }),
    );

    const doc = new DocumentBuilder()
      .setTitle(swaggerConfig.title)
      .setDescription(swaggerConfig.description)
      .setVersion(swaggerConfig.version)
      .addBearerAuth()
      .build();

    SwaggerModule.setup(swaggerConfig.path, app, SwaggerModule.createDocument(app, doc));
  }

  const port = nestConfig.port;
  await app.listen(port, nestConfig.host);
  logger.log(`[${nestConfig.environment}] Running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start auth-service:', err);
  process.exit(1);
});
