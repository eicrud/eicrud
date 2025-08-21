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
  createNewProfileTest,
  testMethod,
} from '../test.utils';
import { UserProfileService as MyProfileService } from '../src/services/user-profile/user-profile.service';
import {
  CRUD_CONFIG_KEY,
  CrudConfigService,
} from '@eicrud/core/config/crud.config.service';
import { TestUser } from '../test.utils';
import exp from 'constants';
import { ICreateAccountDto } from '../../shared/interfaces';
import { timeout } from '../env';

const testAdminCreds = {
  email: 'admin@testmail.com',
  password: 'testpassword',
};

describe('AppController', () => {
  let appController: CrudController;
  let userService: MyUserService;
  let authService: CrudAuthService;
  let profileService: MyProfileService;
  let jwt: string;
  let app: NestFastifyApplication;
  let userId: string;
  let profiles: Record<string, UserProfile> = {};
  let profilesToRemoveIn: Record<string, UserProfile> = {};
  let profilesToRemoveMany: Record<string, UserProfile> = {};
  let profilesToPatchBatch: Record<string, UserProfile> = {};

  let usersWithoutProfiles: string[] = [];

  let entityManager: EntityManager;

  let crudConfig: CrudConfigService;

  const users: Record<string, TestUser> = {
    'Sarah Doe2': {
      email: 'sarah.doe2@test.com',
      role: 'super_admin',
      bio: 'tasty bio',
      store: profiles,
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

    crudConfig = moduleRef.get<CrudConfigService>(CRUD_CONFIG_KEY, {
      strict: false,
    });
    appController = app.get<CrudController>(CrudController);
    userService = app.get<MyUserService>(MyUserService);
    authService = app.get<CrudAuthService>(CrudAuthService);
    profileService = app.get<MyProfileService>(MyProfileService);
    entityManager = app.get<EntityManager>(EntityManager);

    await createAccountsAndProfiles(users, userService, crudConfig, {
      usersWithoutProfiles,
      testAdminCreds,
    });
    const dto: ICreateAccountDto = {
      logMeIn: true,
      email: testAdminCreds.email,
      password: testAdminCreds.password,
      role: 'super_admin',
    };
    const accRes = await userService.$create_account(dto, null);
    jwt = accRes.accessToken;
    userId = crudConfig.dbAdapter.formatId(accRes.userId, crudConfig);
  }, timeout * 2);

  it(
    "patching a profile object id shouldn't turn it into a string",
    async () => {
      const sarahDoeProfile = profiles['Sarah Doe2'];
      const userId = crudConfig.dbAdapter.formatId(
        (sarahDoeProfile.user as any).id,
        crudConfig,
      );
      const payload: Partial<UserProfile> = {
        user: userId,
      } as any;
      const formatedId = crudConfig.dbAdapter.formatId(
        sarahDoeProfile.id,
        crudConfig,
      );
      const query: CrudQuery = {
        service: 'user-profile',
        query: JSON.stringify({ id: formatedId }),
      };

      let res = await testMethod({
        url: '/crud/many',
        method: 'PATCH',
        app,
        jwt,
        entityManager,
        payload,
        query,
        expectedCode: 200,
        crudConfig,
      });

      const expectedObject = {
        ...payload,
        bio: sarahDoeProfile.bio,
      };
      const queryGet: CrudQuery = {
        service: 'user-profile',
        query: JSON.stringify({ user: userId }),
      };

      const find = await testMethod({
        url: '/crud/one',
        method: 'GET',
        app,
        jwt,
        entityManager,
        payload,
        expectedObject,
        query: queryGet,
        expectedCode: 200,
        crudConfig,
      });
    },
    7000 * 100,
  );
});
