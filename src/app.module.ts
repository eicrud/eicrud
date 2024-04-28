import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrudService } from './crud/crud.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CrudController } from './crud/crud.controller';
import { AuthService } from './auth/auth.service';
import { CrudUserService } from './user/crud-user.service';
import { AccountManagementService } from './account-management/account-management.service';
import { LogService } from './log/log.service';
import { NotificationsService } from './notifications/notifications.service';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './errors/AllExceptionsFilter';
import { CrudUser } from './user/model/CrudUser';
import { OcrudModule } from './ocrud.module';
import { CrudConfigService } from './crud/crud.config.service';
@Module({
  imports: [
    CacheModule.register({
      max: 10000,
      ttl: 60 * 1000 * 5,
    }),
    MikroOrmModule.forRoot({
      entities: ['../dist/entities'],
      entitiesTs: ['../src/entities'],
      dbName: 'reserv-db',
      type: 'mongo',
      baseDir: __dirname,
    }),
    OcrudModule.register(CrudConfigService),
],
  controllers: [AppController],
  providers: [
    AppService, 
    CrudService, 
    AuthService, 
    CrudUserService, 
    AccountManagementService, 
    LogService, 
    NotificationsService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
