import { CacheModule, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrudService } from './crud/crud.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CrudController } from './crud/crud.controller';
import { AuthService } from './auth/auth.service';
import { UsersService } from './users/users.service';

@Module({
  imports: [
    CacheModule.register(),
    MikroOrmModule.forRoot({
      entities: ['../dist/entities'],
      entitiesTs: ['../src/entities'],
      dbName: 'reserv-db',
      type: 'mongo',
      baseDir: __dirname,
    }),
],
  controllers: [AppController, CrudController],
  providers: [AppService, CrudService, AuthService, UsersService],
})
export class AppModule {}
