import { CRUDEntities, CRUDServices } from './services/index';
import { Module } from '@nestjs/common';
import { MyConfigService } from './eicrud.config.service';

import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MongoDriver } from '@mikro-orm/mongodb';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';

import { EICRUDModule } from '@eicrud/core/eicrud.module';

import { CRUD_CONFIG_KEY } from '@eicrud/core/config/crud.config.service';

import { FastifyAdapter } from '@nestjs/platform-fastify';
import { EntityManager, MikroORM } from '@mikro-orm/core';
import { postgresUsername, postgresPassword, timeout } from '../env';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

export const getModule = (dbName) => {
  dbName = 'test-' + dbName.replace('.spec.ts', '').replaceAll('.', '-');
  
  if (process.env.CRUD_CURRENT_MS) {
    dbName = 'test-core-ms';
  }

  if (typeof jest !== 'undefined') {
     // set timeout for testcases
      jest.setTimeout(timeout);
  }

  return {
    imports: [
      MikroOrmModule.forRoot({
        entities: [...CRUDEntities],
        driver:
          process.env.TEST_CRUD_DB == 'postgre'
            ? PostgreSqlDriver
            : MongoDriver,
        dbName,
        password: process.env.TEST_CRUD_DB == 'postgre' ? postgresPassword : undefined,
        user: process.env.TEST_CRUD_DB == 'postgre' ? postgresUsername : undefined,
      }),
      EICRUDModule.forRoot(),
    ],
    controllers: [],
    providers: [
      ...CRUDServices,
      {
        provide: CRUD_CONFIG_KEY,
        useClass: MyConfigService,
      },
    ],
  };
};

@Module(getModule('core-ms'))
export class TestModule {}

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
  if (process.env.TEST_CRUD_DB == 'postgre') {
    // Is there some propagation delay with postgres? some tests fail without this
    await new Promise((r) => setTimeout(r, 50));
  } else {
    await new Promise((r) => setTimeout(r, 15));
  }
}

export function createNestApplication(moduleRef: any): any {
  return moduleRef.createNestApplication(new FastifyAdapter());
}

export async function readyApp(app) {
  return await app.getHttpAdapter().getInstance().ready();
}
