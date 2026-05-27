import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

/** Build timestamp = baked at deploy time. Useful to verify which version is live. */
const BUILD_TIME = new Date().toISOString();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Petit endpoint publique pour verifier ce qui tourne sur Render.
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/api/version', (_req: unknown, res: { json: (b: object) => void }) => {
    res.json({
      version: '0.1',
      // Commit injecte par Render via RENDER_GIT_COMMIT, sinon "local".
      commit: (process.env.RENDER_GIT_COMMIT ?? 'local').substring(0, 7),
      startedAt: BUILD_TIME,
      now: new Date().toISOString(),
    });
  });

  const config = new DocumentBuilder()
    .setTitle('Family Cash Management API')
    .setDescription('Multi-tenant caisse familiale')
    .setVersion('0.1')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-Family-Id', in: 'header' }, 'family-id')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(`FACAM API ready on http://localhost:${port}/api`, 'Bootstrap');
}
bootstrap();
