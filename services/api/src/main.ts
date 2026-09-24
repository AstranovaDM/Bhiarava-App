import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { assertEnvOrThrow, validateEnv } from './common/env/env.schema';
import { structuredLog } from './common/logging/logger';

async function bootstrap() {
  const envCheck = validateEnv();
  if (!envCheck.ok) {
    structuredLog('warn', 'env_validation_issues', {
      issues: envCheck.issues,
      note: 'Boot continues in non-production; production would fail closed',
    });
    if (process.env.NODE_ENV === 'production') {
      assertEnvOrThrow();
    }
  }

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');
  app.enableCors({ origin: true, credentials: true });
  const port = Number(process.env.PORT || 4000);
  await app.listen(port);
  structuredLog('info', 'api_listening', { port });
}
bootstrap();
