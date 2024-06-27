import { Test, TestingModule } from '@nestjs/testing';
import {
  getModule,
  createNestApplication,
  readyApp,
  dropDatabases,
} from '../src/app.module';
import { CrudController } from '../../core/crud/crud.controller';
import { MyUserService } from '../src/services/myuser/myuser.service';
import { CrudAuthService } from '../../core/authentication/auth.service';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { UserProfile } from '../src/services/userprofile/userprofile.entity';
import {
  createAccountsAndProfiles,
  createMelons,
  createNewProfileTest,
  testMethod,
} from '../test.utils';
import { UserProfileService as MyProfileService } from '../src/services/userprofile/userprofile.service';
import { Melon } from '../src/services/melon/melon.entity';
import { CrudService } from '../../core/crud/crud.service';
import { TestUser } from '../test.utils';
import {
  CRUD_CONFIG_KEY,
  CrudConfigService,
  MicroServiceConfig,
} from '../../core/config/crud.config.service';
import { format } from 'path';
import exp from 'constants';
import { MelonService } from '../src/services/melon/melon.service';
import axios from 'axios';
import { CrudOptions } from '../../core/crud/model/CrudOptions';

const testAdminCreds = {
  email: 'admin@testmail.com',
  password: 'testpassword',
};

describe('AppController', () => {
  let appController: CrudController;
  let userService: MyUserService;
  let authService: CrudAuthService;
  let profileService: MyProfileService;
  let melonService: MelonService;
  let app: NestFastifyApplication;

  let entityManager: EntityManager;

  let crudConfig: CrudConfigService;

  const users: Record<string, TestUser> = {
    'Michael Doe': {
      email: 'michael.doe@test.com',
      role: 'user',
      bio: 'I am a cool guy.',
      pictures: 1,
    },
    'Sarah Doe': {
      email: 'sarah.doe@test.com',
      role: 'user',
      bio: 'I am a cool girl.',
      melons: 5,
      pictures: 4,
    },
    'Admin Dude': {
      email: 'admin.dude@mail.com',
      role: 'admin',
      bio: 'I am a sys admin.',
      profileType: 'admin',
      pictures: 3,
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
    melonService = app.get<MelonService>(MelonService);
    entityManager = app.get<EntityManager>(EntityManager);
    crudConfig = app.get<CrudConfigService>(CRUD_CONFIG_KEY, { strict: false });

    await createAccountsAndProfiles(users, userService, crudConfig, {
      testAdminCreds,
    });
  });

  it('should populate pictures', async () => {
    const user = users['Admin Dude'];
    const populatedUser = users['Sarah Doe'];
    const payload = {};

    let query = {
      service: 'user-profile',
      query: JSON.stringify({
        user: populatedUser.id?.toString(),
        type: 'basic',
      }),
      options: JSON.stringify({
        populate: ['pictures'],
      } as CrudOptions),
    };

    const res = await testMethod({
      url: '/crud/one',
      method: 'GET',
      expectedCode: 200,
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });

    expect(res.pictures?.length).toBe(populatedUser.pictures);
    for (let i = 0; i < res.pictures.length; i++) {
      expect(res.pictures[i].alt).toBe(`Alt ${i}`);
    }

    query = {
      service: 'user-profile',
      query: JSON.stringify({ type: 'basic' }),
      options: JSON.stringify({
        populate: ['pictures'],
      } as CrudOptions),
    };

    const res2 = await testMethod({
      url: '/crud/many',
      method: 'GET',
      expectedCode: 200,
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });
    expect(res2.length).toBeTruthy();
    for (let usr of res2) {
      const base = users[usr.userName];
      expect(usr.pictures?.length).toBe(base.pictures);
      if (base.pictures) {
        for (let i = 0; i < usr.pictures.length; i++) {
          expect(usr.pictures[i].src).toBe(`https://example.com/${i}`);
        }
      }
    }
  });

  it('should validate and authorize populate', async () => {
    const user = users['Admin Dude'];

    const payload = {};

    let query = {
      service: 'user-profile',
      query: JSON.stringify({ type: 'basic' }),
      options: JSON.stringify({
        populate: 'pictures',
      }) as any,
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

    query.options = JSON.stringify({
      populate: ['pictures'],
    } as CrudOptions);

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

    query.options = JSON.stringify({
      populate: ['pictures', 'user'],
    } as CrudOptions);

    await testMethod({
      url: '/crud/many',
      method: 'GET',
      expectedCode: 403,
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      crudConfig,
      returnLimitAndTotal: true,
    });

    query.query = JSON.stringify({ type: 'basic', user: user.id });

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
  });
});
