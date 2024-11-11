import { Test, TestingModule } from '@nestjs/testing';

import {
  getModule,
  createNestApplication,
  readyApp,
  dropDatabases,
} from '../src/app.module';
import { CrudController } from '@eicrud/core/crud/crud.controller';
import { MyUserService } from '../src/services/my-user/my-user.service';
import { CrudAuthService } from '@eicrud/core/authentication/auth.service';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { EntityManager } from '@mikro-orm/core';
import { UserProfile } from '../src/services/user-profile/user-profile.entity';
import { CrudQuery } from '@eicrud/core/crud/model/CrudQuery';
import {
  createAccountsAndProfiles,
  createMelons,
  createNewProfileTest,
  testMethod,
} from '../test.utils';
import { UserProfileService as MyProfileService } from '../src/services/user-profile/user-profile.service';
import { Melon } from '../src/services/melon/melon.entity';
import { CrudService } from '@eicrud/core/crud/crud.service';
import { TestUser } from '../test.utils';
import {
  CRUD_CONFIG_KEY,
  CrudConfigService,
} from '@eicrud/core/config/crud.config.service';
import { format } from 'path';
import exp from 'constants';
import { CrudAuthGuard } from '@eicrud/core/authentication/auth.guard';

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

  const users: Record<string, TestUser> = {
    'Michael Doe': {
      email: 'michael.doe@test.com',
      role: 'user',
      bio: 'I am a cool guy.',
    },
    'Sarah Doe': {
      email: 'sarah.doe@test.com',
      role: 'user',
      bio: 'I am a cool girl.',
      melons: 5,
    },
  };

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

    await createAccountsAndProfiles(users, userService, crudConfig, {
      testAdminCreds,
    });
  });

  //jest.retryTimes(1);

  it('should limit user requests', async () => {
    const user = users['Michael Doe'];

    // await authGuard.ipTrafficCache.clear?.();
    // await authGuard.userTrafficCache.clear?.();

    const query: CrudQuery = {
      service: 'melon',
      query: JSON.stringify({}),
    };
    const payload = {};

    const promises = [];

    crudConfig.captchaService = 'captcha';
    let didCaptcha = false;

    for (
      let u = 0;
      u <= crudConfig.watchTrafficOptions.totalTimeoutThreshold;
      u++
    ) {
      for (
        let i = 0;
        i <= crudConfig.watchTrafficOptions.userRequestsThreshold - 1;
        i++
      ) {
        const prom = testMethod({
          url: '/crud/many',
          method: 'GET',
          app,
          jwt: user.jwt,
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
      while (res < crudConfig.watchTrafficOptions.userRequestsThreshold) {
        res = (await authGuard.userTrafficCache.get(user.id?.toString())) || 0;
        await new Promise((r) => setTimeout(r, 200));
      }

      await testMethod({
        url: '/crud/many',
        method: 'GET',
        app,
        jwt: user.jwt,
        entityManager,
        payload,
        query,
        expectedCode: 200,
        crudConfig,
      });
      while (res > 0) {
        res = await authGuard.userTrafficCache.get(user.id?.toString());
        await new Promise((r) => setTimeout(r, 200));
      }

      if (!didCaptcha) {
        await testMethod({
          url: '/crud/many',
          method: 'GET',
          app,
          jwt: user.jwt,
          entityManager,
          payload,
          query,
          expectedCode: 401,
          crudConfig,
        });

        await userService.$unsecure_fastPatchOne(
          user.id,
          { didCaptcha: true } as any,
          null,
        );

        //Will refresh user cache (POST)
        await testMethod({
          url: '/crud/one',
          method: 'POST',
          app,
          jwt: user.jwt,
          entityManager,
          payload,
          query,
          expectedCode: 400,
          crudConfig,
        });

        await testMethod({
          url: '/crud/many',
          method: 'GET',
          app,
          jwt: user.jwt,
          entityManager,
          payload,
          query,
          expectedCode: 200,
          crudConfig,
        });
        didCaptcha = true;
      }

      await authGuard.ipTrafficCache.clear?.();
      await authGuard.userTrafficCache.clear?.();
    }

    //50ms delay
    await new Promise((r) => setTimeout(r, 50));

    await testMethod({
      url: '/crud/many',
      method: 'GET',
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      expectedCode: 401,
      crudConfig,
    });

    await userService.$unsecure_fastPatchOne(
      user.id,
      { timeout: new Date() } as any,
      null,
    );

    //Will refresh user cache (POST)
    await testMethod({
      url: '/crud/one',
      method: 'POST',
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      expectedCode: 400,
      crudConfig,
    });

    await testMethod({
      url: '/crud/many',
      method: 'GET',
      jwt: user.jwt,
      app,
      entityManager,
      payload,
      query,
      expectedCode: 200,
      crudConfig,
    });

    crudConfig.captchaService = null;
  }, timeout*6);
});
