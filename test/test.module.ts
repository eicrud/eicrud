import { Module } from '@nestjs/common';
import { MyConfigService } from './myconfig.service';
import { MyEmailService } from './myemail.service';
import { MyUserService } from './myuser.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MongoDriver } from '@mikro-orm/mongodb';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { MyUser } from './entities/MyUser';
import { UserProfile } from './entities/UserProfile';
import { FakeEmail } from './entities/FakeEmail';
import { Melon } from './entities/Melon';
import { EICRUDModule } from '../core/eicrud.module';
import { MelonService } from './melon.service';
import { CRUD_CONFIG_KEY } from '../core/config/crud.config.service';
import { MyProfileService } from './profile.service';
import { Picture } from './entities/Picture';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { EntityManager, MikroORM } from '@mikro-orm/core';
import { MyPictureService } from './picture.service';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

export async function dropDatabases(moduleRef: any): Promise<void> {
  const em = moduleRef.get(EntityManager);
  const orm: MikroORM = moduleRef.get(MikroORM);
  if (process.env.TEST_CRUD_DB == 'postgre') {
    const generator = orm.schema;

    // or you can run those queries directly, but be sure to check them first!
    await generator.dropSchema();
    await generator.createSchema();
    await generator.updateSchema();

    // in tests it can be handy to use those:
    await generator.refreshDatabase(); // ensure db exists and is fresh
    await generator.clearDatabase(); // removes all data
  } else {
    await em.getConnection().getDb().dropDatabase();
  }
}

export function createNestApplication(moduleRef: any): any {
  return moduleRef.createNestApplication(new FastifyAdapter());
}

export async function readyApp(app) {
  return await app.getHttpAdapter().getInstance().ready();
}

export const getModule = (dbName) => {
  dbName = 'test-' + dbName.replace('.spec.ts', '').replaceAll('.', '-');

  if (process.env.CRUD_CURRENT_MS) {
    dbName = 'test-core-ms';
  }

  return {
    imports: [
      MikroOrmModule.forRoot({
        entities: [MyUser, UserProfile, FakeEmail, Melon, Picture],
        driver:
          process.env.TEST_CRUD_DB == 'postgre'
            ? PostgreSqlDriver
            : MongoDriver,
        dbName,
        password: process.env.TEST_CRUD_DB == 'postgre' ? 'admin' : undefined,
        user: process.env.TEST_CRUD_DB == 'postgre' ? 'postgres' : undefined,
      }),
      EICRUDModule.forRoot(),
    ],
    controllers: [],
    providers: [
      MyEmailService,
      MyUserService,
      MelonService,
      MyProfileService,
      MyPictureService,
      {
        provide: CRUD_CONFIG_KEY,
        useClass: MyConfigService,
      },
    ],
  };
};

@Module(getModule('core-ms'))
export class TestModule {}
