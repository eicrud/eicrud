import { NestFactory } from '@nestjs/core';
import { TestModule, getModule } from './test/test.module';
import { FastifyAdapter } from '@nestjs/platform-fastify';

async function bootstrap() {
  const app = await NestFactory.create(TestModule, new FastifyAdapter());
  const PORT = process.env.PORT || 3000;

  process.on('SIGTERM', async () => {
    if (process.env.GRACEFUL_EXIT) {
      console.log('EXITING GRACEFULLY...');
      process.exit(0);
    }
  });

  console.log(`Listening on port ${PORT}`);
  await app.listen(PORT);
}

bootstrap();
