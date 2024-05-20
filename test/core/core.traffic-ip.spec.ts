import { Test, TestingModule } from '@nestjs/testing';

import { getModule, createNestApplication, readyApp, dropDatabases } from '../test.module';
import { CrudController } from '../../core/crud/crud.controller';
import { MyUserService } from '../myuser.service';
import { CrudAuthService } from '../../core/authentification/auth.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { UserProfile } from '../entities/UserProfile';
import { CrudQuery } from '../../core/crud/model/CrudQuery';
import { createAccountsAndProfiles, createMelons, createNewProfileTest,  testMethod } from '../test.utils';
import { MyProfileService } from '../profile.service';
import { Melon } from '../entities/Melon';
import { CrudService } from '../../core/crud/crud.service';
import { TestUser } from '../test.utils';
import { CRUD_CONFIG_KEY, CrudConfigService } from '../../core/crud/crud.config.service';
import { format } from 'path';
import exp from 'constants';
import { CrudAuthGuard } from '../../core/authentification/auth.guard';
import { APP_GUARD } from '@nestjs/core';

const testAdminCreds = {
  email: "admin@testmail.com",
  password: "testpassword"
}

describe('AppController', () => {
  let appController: CrudController;
  let userService: MyUserService;
  let authService: CrudAuthService;
  let authGuard: CrudAuthGuard;
  let profileService: MyProfileService;
  let app: NestFastifyApplication;

  let entityManager: EntityManager;

  let crudConfig: CrudConfigService;



  beforeAll(async () => {

    const moduleRef: TestingModule = await Test.createTestingModule(
      getModule(require('path').basename(__filename))
    ).compile();
    await dropDatabases(moduleRef);

    app = createNestApplication(moduleRef)

    await app.init();
    await readyApp(app);

    appController = app.get<CrudController>(CrudController);
    userService = app.get<MyUserService>(MyUserService);
    authService = app.get<CrudAuthService>(CrudAuthService);
    authGuard = authService.authGuard;
    profileService = app.get<MyProfileService>(MyProfileService);
    entityManager = app.get<EntityManager>(EntityManager);
    crudConfig = app.get<CrudConfigService>(CRUD_CONFIG_KEY, { strict: false });

  });

  it('should limit ip requests', async () => {

    const query: CrudQuery = {
      service: 'melon',
      query: JSON.stringify({ })
    }
    const payload = {}

    const promises = [];

    for(let i = 0; i <= (crudConfig.watchTrafficOptions.IP_REQUEST_THRESHOLD + 1); i++){
      const prom = testMethod({ url: '/crud/many', method: 'GET', app, entityManager, payload, query, expectedCode: 200, crudConfig });
      promises.push(prom);
    }
    const res = await Promise.all(promises);
    await testMethod({ url: '/crud/many', method: 'GET', app, entityManager, payload, query, expectedCode: 429, crudConfig });
  
    authGuard.ipTrafficMap.clear();

    await testMethod({ url: '/crud/many', method: 'GET', app, entityManager, payload, query, expectedCode: 429, crudConfig });

    authGuard.timedOutIps.set('127.0.0.1', 0);

    await testMethod({ url: '/crud/many', method: 'GET', app, entityManager, payload, query, expectedCode: 200, crudConfig });

  }, 10000);


  



});