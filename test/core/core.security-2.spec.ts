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
import { MsLinkQuery, CrudQuery } from '@eicrud/core/crud/model/CrudQuery';
import { createAccountsAndProfiles, testMethod } from '../test.utils';
import { CrudService } from '@eicrud/core/crud/crud.service';
import { TestUser } from '../test.utils';
import {
  CRUD_CONFIG_KEY,
  CrudConfigService,
} from '@eicrud/core/config/crud.config.service';
import { format } from 'path';
import exp from 'constants';
import { MelonService } from '../src/services/melon/melon.service';
import axios from 'axios';
import { CrudErrors } from '@eicrud/shared/CrudErrors';
import { DragonFruit } from '../src/services/dragon-fruit/dragon-fruit.entity';
import { FindResponseDto } from '../../shared/interfaces';
import { DragonFruitService } from '../src/services/dragon-fruit/dragon-fruit.service';

const testAdminCreds = {
  email: 'admin@testmail.com',
  password: 'testpassword',
};
const timeout = Number(process.env.TEST_TIMEOUT);

describe('AppController', () => {
  let appController: CrudController;
  let userService: MyUserService;
  let authService: CrudAuthService;
  let dragonFruitService: DragonFruitService;
  let melonService: MelonService;
  let app: NestFastifyApplication;

  let entityManager: EntityManager;

  let crudConfig: CrudConfigService;

  const users: Record<string, TestUser> = {
    'Michael Doe': {
      email: 'michael.doe@test.com',
      role: 'user',
      bio: 'I am a cool guy.',
    },
    'Michael Foe': {
      email: 'michael.foe@test.com',
      role: 'user',
      bio: 'I am a bad guy.',
    },
    'Sarah Doe': {
      email: 'sarah.doe@test.com',
      role: 'user',
      bio: 'I am a cool girl.',
      dragonfruits: 5,
    },
    'John NoProfile': {
      email: 'john.noprofile@mail.com',
      role: 'user',
      bio: 'I am a cool guy.',
      skipProfile: true,
      dragonfruits: 5,
    },
    'Hack NoProfile': {
      email: 'hack.noprofile@mail.com',
      role: 'user',
      bio: 'I am a cool guy.',
      skipProfile: true,
    },
    'Greed NoProfile': {
      email: 'greed.noprofile@mail.com',
      role: 'user',
      bio: 'I am a cool guy.',
      skipProfile: true,
    },
    'Trusted NoProfile': {
      email: 'trustedgreed.noprofile@mail.com',
      role: 'trusted_user',
      bio: 'I am a cool guy.',
      skipProfile: true,
    },
    'Trusted NoProfile2': {
      email: 'trusted2.noprofile@mail.com',
      role: 'trusted_user',
      bio: 'I am a cool guy.',
      skipProfile: true,
    },
    'Trusted NoProfile3': {
      email: 'trusted3.noprofile@mail.com',
      role: 'trusted_user',
      bio: 'I am a cool guy.',
      skipProfile: true,
    },
    'Moderator Joe': {
      email: 'moderator.joe@mail.com',
      role: 'moderator',
      bio: 'I am a discord mod.',
      profileType: 'admin',
    },
    'Moderator Bro': {
      email: 'moderator.bro@mail.com',
      role: 'moderator',
      bio: 'I am a reddit mod.',
      profileType: 'admin',
    },
    'Admin Dude': {
      email: 'admin.dude@mail.com',
      role: 'admin',
      bio: 'I am a sys admin.',
      profileType: 'admin',
    },
    'Joe Many': {
      email: 'Joe.Many@mail.com',
      role: 'user',
      bio: 'BIO_FIND_MANY_KEY',
    },
    'Don Many': {
      email: 'Don.Many@mail.com',
      role: 'user',
      bio: 'BIO_FIND_MANY_KEY',
    },
    'Moe Many': {
      email: 'Moe.Many@mail.com',
      role: 'user',
      bio: 'BIO_FIND_MANY_KEY',
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
    dragonFruitService = app.get<DragonFruitService>(DragonFruitService);
    melonService = app.get<MelonService>(MelonService);
    entityManager = app.get<EntityManager>(EntityManager);
    crudConfig = app.get<CrudConfigService>(CRUD_CONFIG_KEY, { strict: false });

    await createAccountsAndProfiles(users, userService, crudConfig, {
      testAdminCreds,
    });
  });

  it('should limit find dragonfruit when limit is specified and alwaysExcludeFields secretCode field', async () => {
    const user: TestUser = users['Michael Doe'];

    const payload: Partial<DragonFruit> = {} as any;
    const query: CrudQuery = {
      service: CrudService.getName(DragonFruit),
      query: JSON.stringify({}),
    };

    const resGuest: DragonFruit[] = await testMethod({
      expectedCode: 200,
      url: '/crud/many',
      method: 'GET',
      app,
      jwt: null,
      entityManager,
      payload,
      query,
      crudConfig,
    });

    for (const r of resGuest) {
      expect(Object.keys(r)).toEqual(['id', 'name']);
      expect(r.name).toBeTruthy();
    }

    const resUser: DragonFruit[] = await testMethod({
      expectedCode: 200,
      url: '/crud/many',
      method: 'GET',
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });

    for (const r of resUser) {
      expect(Object.keys(r)).toEqual(['id', 'name']);
      expect(r.name).toBeTruthy();
    }

    const trusted_user = users['Trusted NoProfile'];

    const resTrustedUser: DragonFruit[] = await testMethod({
      expectedCode: 200,
      url: '/crud/many',
      method: 'GET',
      app,
      jwt: trusted_user.jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });

    let keys_count;
    for (const r of resTrustedUser) {
      keys_count = Object.keys(r).length;
      expect(keys_count).toBeGreaterThan(5);
      expect(r.secretCode).toBeUndefined();
    }

    const resDb: any = await dragonFruitService.$find({}, null);
    expect(resDb.data.length).toEqual(resTrustedUser.length);
    const addKeyCount =
      process.env.TEST_CRUD_DB == 'postgre' || process.env.CRUD_CURRENT_MS
        ? 1
        : 2;
    for (const r of resDb.data) {
      expect(Object.keys(r).length).toEqual(keys_count + addKeyCount);
      expect(r.secretCode).toBeTruthy();
    }
  });

  it("user shouldn't be able to update its profile user (owner)", async () => {
    const user = users['Sarah Doe'];
    const otherUser = users['Michael Doe'];
    const payload: Partial<UserProfile> = {
      user: otherUser.id.toString(),
    };

    const query: CrudQuery = {
      service: CrudService.getName(UserProfile),
      query: JSON.stringify({ user: user.id.toString() }),
    };

    await testMethod({
      expectedCode: 403,
      url: '/crud/one',
      method: 'PATCH',
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });
  });

  it('should prevent patch & remove skip with _id', async () => {
    const user = users['Sarah Doe'];
    const admin = users['Admin Dude'];
    const payload: Partial<UserProfile> = {
      userName: 'Sarah Jane',
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({
        id: crudConfig.dbAdapter.formatId(admin.profileId, crudConfig),
        user: crudConfig.dbAdapter.formatId(user.id, crudConfig),
      }),
    };

    let res = await testMethod({
      url: '/crud/one',
      method: 'PATCH',
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      expectedCode: 400,
      expectedCrudCode: CrudErrors.ENTITY_NOT_FOUND.code,
      crudConfig,
    });

    await testMethod({
      url: '/crud/one',
      method: 'DELETE',
      app,
      jwt: user.jwt,
      entityManager,
      payload: {},
      query,
      expectedCode: 400,
      expectedCrudCode: CrudErrors.ENTITY_NOT_FOUND.code,
      crudConfig,
    });
  });

  it('should prevent batch operation when payload is not an array', async () => {
    const user = users['Admin Dude'];

    const payload = { length: 5e99 };
    const query = { service: 'melon' };
    await testMethod({
      url: '/crud/batch',
      method: 'PATCH',
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      expectedCode: 400,
      expectedCrudCode: CrudErrors.PAYLOAD_MUST_BE_ARRAY.code,
      crudConfig,
    });

    await testMethod({
      url: '/crud/batch',
      method: 'POST',
      app,
      jwt: user.jwt,
      entityManager,
      payload: null,
      query,
      expectedCode: 400,
      expectedCrudCode: CrudErrors.PAYLOAD_MUST_BE_ARRAY.code,
      crudConfig,
    });
  });

  //@Get('/crud/one')
  it('should authorize with basic auth', async () => {
    const user: TestUser = users['Michael Foe'];
    const payload: Partial<UserProfile> = {} as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({
        user: crudConfig.dbAdapter.formatId(user.id as any, crudConfig),
      }),
    };
    const expectedObject = {
      bio: user.bio,
    };

    await testMethod({
      url: '/crud/one',
      method: 'GET',
      app,
      entityManager,
      payload,
      query,
      expectedCode: 403,
      crudConfig,
    });

    await testMethod({
      url: '/crud/one',
      method: 'GET',
      app,
      basicAuth: {
        username: users['Michael Doe'].email,
        password: testAdminCreds.password,
      },
      entityManager,
      payload,
      query,
      expectedCode: 403,
      crudConfig,
    });

    await testMethod({
      url: '/crud/one',
      method: 'GET',
      app,
      basicAuth: { username: user.email, password: testAdminCreds.password },
      entityManager,
      payload,
      query,
      expectedCode: 200,
      expectedObject,
      crudConfig,
    });
  }, timeout*2);
});
