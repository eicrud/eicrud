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
import { TestCmdDto as TestCmdDto } from '../src/services/user-profile/cmds/test_cmd/test_cmd.dto';
import { Melon } from '../src/services/melon/melon.entity';
import { CrudService } from '../../core/crud/crud.service';
import { TestUser } from '../test.utils';
import {
  CRUD_CONFIG_KEY,
  CrudConfigService,
} from '../../core/config/crud.config.service';
import { format } from 'path';
import exp from 'constants';
import { CrudOptions } from '../../core/crud/model/CrudOptions';
import { CrudErrors } from '../../shared/CrudErrors';

const testAdminCreds = {
  email: 'admin@testmail.com',
  password: 'testpassword',
};

describe('AppController', () => {
  let appController: CrudController;
  let userService: MyUserService;
  let authService: CrudAuthService;
  let profileService: MyProfileService;
  let app: NestFastifyApplication;

  let entityManager: EntityManager;

  let crudConfig: CrudConfigService;

  const users: Record<string, TestUser> = {
    'Michael Doe': {
      email: 'michael.doe@test.com',
      role: 'user',
      bio: 'I am a cool guy.',
      melons: 10000,
    },
    'Jon Doe': {
      email: 'jon.doe@test.com',
      role: 'user',
      bio: 'I am a cool guy.',
    },
    'Admin Dude': {
      email: 'admin.dude@mail.com',
      role: 'admin',
      bio: 'I am a sys admin.',
      profileType: 'admin',
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
    profileService = app.get<MyProfileService>(MyProfileService);
    entityManager = app.get<EntityManager>(EntityManager);
    crudConfig = app.get<CrudConfigService>(CRUD_CONFIG_KEY, { strict: false });

    await createAccountsAndProfiles(users, userService, crudConfig, {
      testAdminCreds,
    });
  });

  it('should validate crudOptions', async () => {
    const user = users['Michael Doe'];

    const payload = {};

    let query = {
      service: 'melon',
      query: '{}',
      options: JSON.stringify({
        limit: 5 as any,
      } as CrudOptions) as any,
    };

    await testMethod({
      url: '/crud/many',
      method: 'GET',
      expectedCode: 200,
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      crudConfig,
      returnLimitAndTotal: true,
    });

    query = {
      service: 'melon',
      query: '{}',
      options: JSON.stringify({
        limit: 'string' as any,
      } as CrudOptions) as any,
    };

    await testMethod({
      url: '/crud/many',
      method: 'GET',
      expectedCode: 400,
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      crudConfig,
      returnLimitAndTotal: true,
    });
  });

  it('should apply security to crudOptions', async () => {
    // const user = users["Michael Doe"];
    // const payload = {}
    // let query = {
    //   service: "melon",
    //   query: "{}",
    //   options: JSON.stringify({
    //     limit: 5 as any
    //   } as CrudOptions) as any
    // }
    // await testMethod({ url: '/crud/many', method: 'GET', expectedCode: 200, app, jwt: user.jwt, entityManager, payload, query, crudConfig, returnLimitAndTotal: true});
    // query = {
    //   service: "melon",
    //   query: "{}",
    //   options: JSON.stringify({
    //     limit: "string" as any
    //   } as CrudOptions) as any
    // }
    // await testMethod({ url: '/crud/many', method: 'GET', expectedCode: 400, app, jwt: user.jwt, entityManager, payload, query, crudConfig, returnLimitAndTotal: true});
  });

  // it('should inherit cmd rights', async () => {
  //   const user = users["Admin Dude"];

  //   const payload: TestCmdDto = {
  //     returnMessage: "Hello World"
  //   }

  //   const query: CrudQuery = {
  //     service: "user-profile",
  //     cmd: "test_cmd",
  //   }

  //   await testMethod({ url: '/crud/cmd', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

  // });
});
