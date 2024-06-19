import { NestFactory } from '@nestjs/core';
import { TestModule, getModule } from './test/src/app.module';
import { FastifyAdapter } from '@nestjs/platform-fastify';

async function bootstrap() {
  const app = await NestFactory.create(TestModule, new FastifyAdapter());
  const PORT = process.env.PORT || 3000;
  console.log(`Listening on port ${PORT}`);

  await app.listen(PORT);
}

bootstrap();
