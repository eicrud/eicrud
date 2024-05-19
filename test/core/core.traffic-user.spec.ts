import { Test, TestingModule } from '@nestjs/testing';

import { getModule } from '../test.module';
import { CrudController } from '../../core/crud/crud.controller';
import { MyUserService } from '../myuser.service';
import { CrudAuthService } from '../../core/authentification/auth.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { UserProfile } from '../entities/UserProfile';
import { CrudQuery } from '../../core/crud/model/CrudQuery';
import { createAccountsAndProfiles, createMelons, createNewProfileTest, testMethod } from '../test.utils';
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

  const users: Record<string, TestUser> = {

    "Michael Doe": {
      email: "michael.doe@test.com",
      role: "user",
      bio: 'I am a cool guy.',
    },
    "Sarah Doe": {
      email: "sarah.doe@test.com",
      role: "user",
      bio: 'I am a cool girl.',
      melons: 5
    },
  
  }

  beforeAll(async () => {

    const moduleRef: TestingModule = await Test.createTestingModule(
      getModule(require('path').basename(__filename))
    ).compile();
    await moduleRef.get<EntityManager>(EntityManager).getConnection().getDb().dropDatabase();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    appController = app.get<CrudController>(CrudController);
    userService = app.get<MyUserService>(MyUserService);
    authService = app.get<CrudAuthService>(CrudAuthService);
    authGuard = authService.authGuard;
    profileService = app.get<MyProfileService>(MyProfileService);
    entityManager = app.get<EntityManager>(EntityManager);
    crudConfig = app.get<CrudConfigService>(CRUD_CONFIG_KEY, { strict: false });
    const em = entityManager.fork();

    await createAccountsAndProfiles(users, em, userService, crudConfig, { testAdminCreds });

  });


  it('should limit user requests', async () => {
    const user = users["Michael Doe"];
  
    const query: CrudQuery = {
      service: 'melon',
      query: JSON.stringify({ })
    }
    const payload = {}

    let promises = [];

    let didCaptcha = false;

    for(let u = 0; u < (crudConfig.watchTrafficOptions.TIMEOUT_THRESHOLD_TOTAL); u++){
      
      for(let i = 0; i <= (crudConfig.watchTrafficOptions.USER_REQUEST_THRESHOLD); i++){
        const prom = testMethod({ url: '/crud/many', method: 'GET', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 200, crudConfig })
        .catch(e => {
          console.log(u, i);
          console.log(e);
          throw e;
        });

        promises.push(prom);
      }
      const res = await Promise.all(promises);

      if(!didCaptcha){
        await testMethod({ url: '/crud/many', method: 'GET', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 401, crudConfig });

        await userService.$unsecure_fastPatchOne(user.id, { didCaptcha: true } as any, null);
  
        //Will refresh user cache (POST)
        await testMethod({ url: '/crud/one', method: 'POST', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 400, crudConfig });
        
        await testMethod({ url: '/crud/many', method: 'GET', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 200, crudConfig });
        didCaptcha = true;
      }

      authGuard.ipTrafficMap.clear();
      authGuard.userTrafficMap.clear();

    }

    await testMethod({ url: '/crud/many', method: 'GET', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 401, crudConfig });

    await userService.$unsecure_fastPatchOne(user.id, { timeout: new Date() } as any, null);

    //Will refresh user cache (POST)
    await testMethod({ url: '/crud/one', method: 'POST', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 400, crudConfig });

    await testMethod({ url: '/crud/many', method: 'GET', jwt: user.jwt, app, entityManager, payload, query, expectedCode: 200, crudConfig });

  }, 20000);


});