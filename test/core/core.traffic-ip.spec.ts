import { Test, TestingModule } from '@nestjs/testing';

import {
  getModule,
  createNestApplication,
  readyApp,
  dropDatabases,
} from '../src/app.module';
import { CrudController } from '../../core/crud/crud.controller';
import { MyUserService } from '../src/services/my-user/my-user.service';
import { CrudAuthService } from '../../core/authentication/auth.service';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { EntityManager } from '@mikro-orm/core';
import { UserProfile } from '../src/services/user-profile/user-profile.entity';
import { CrudQuery } from '../../core/crud/model/CrudQuery';
import {
  createAccountsAndProfiles,
  createMelons,
  createNewProfileTest,
  testMethod,
} from '../test.utils';
import { UserProfileService as MyProfileService } from '../src/services/user-profile/user-profile.service';
import { Melon } from '../src/services/melon/melon.entity';
import { CrudService } from '../../core/crud/crud.service';
import { TestUser } from '../test.utils';
import {
  CRUD_CONFIG_KEY,
  CrudConfigService,
} from '../../core/config/crud.config.service';
import { format } from 'path';
import exp from 'constants';
import { CrudAuthGuard } from '../../core/authentication/auth.guard';
import { APP_GUARD } from '@nestjs/core';

const testAdminCreds = {
  email: 'admin@testmail.com',
  password: 'testpassword',
};
const timeout = Number(process.env.TEST_TIMEOUT);

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
      getModule(require('path').basename(__filename)),
    ).compile();
    await dropDatabases(moduleRef);

    app = createNestApplication(moduleRef);

    await app.init();
    await readyApp(app);

    appController = app.get<CrudController>(CrudController);
    userService = app.get<MyUserService>(MyUserService);
    authService = app.get<CrudAuthService>(CrudAuthService);
    authGuard = authService._authGuard;
    profileService = app.get<MyProfileService>(MyProfileService);
    entityManager = app.get<EntityManager>(EntityManager);
    crudConfig = app.get<CrudConfigService>(CRUD_CONFIG_KEY, { strict: false });
  });

  it('should limit ip requests', async () => {
    const query: CrudQuery = {
      service: 'melon',
      query: JSON.stringify({}),
    };
    const payload = {};

    const promises = [];

    for (
      let i = 0;
      i <= crudConfig.watchTrafficOptions.ipRequestsThreshold;
      i++
    ) {
      const prom = testMethod({
        url: '/crud/many',
        method: 'GET',
        app,
        entityManager,
        payload,
        query,
        expectedCode: 200,
        crudConfig,
      });
      promises.push(prom);
    }
    await Promise.all(promises);

    let res = 0;
    while (res < crudConfig.watchTrafficOptions.ipRequestsThreshold) {
      res = (await authGuard.ipTrafficCache.get('127.0.0.1')) || 0;
      await new Promise((r) => setTimeout(r, 200));
    }

    await testMethod({
      url: '/crud/many',
      method: 'GET',
      app,
      entityManager,
      payload,
      query,
      expectedCode: 200,
      crudConfig,
    });

    await new Promise((r) => setTimeout(r, 200));

    await testMethod({
      url: '/crud/many',
      method: 'GET',
      app,
      entityManager,
      payload,
      query,
      expectedCode: 429,
      crudConfig,
    });

    authGuard.ipTrafficCache.clear?.();

    await testMethod({
      url: '/crud/many',
      method: 'GET',
      app,
      entityManager,
      payload,
      query,
      expectedCode: 429,
      crudConfig,
    });

    authGuard.ipTimeoutCache.set('127.0.0.1', 0);
    res = 1;
    while (res != 0) {
      res = await authGuard.ipTimeoutCache.get('127.0.0.1');
      await new Promise((r) => setTimeout(r, 200));
    }

    await testMethod({
      url: '/crud/many',
      method: 'GET',
      app,
      entityManager,
      payload,
      query,
      expectedCode: 200,
      crudConfig,
    });
  }, timeout*2);
});
