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
import UserProfile from '../src/services/userprofile/userprofile.entity';
import { CrudQuery } from '../../core/crud/model/CrudQuery';
import {
  createAccountsAndProfiles,
  createMelons,
  createNewProfileTest,
  testMethod,
} from '../test.utils';
import { UserProfileService as MyProfileService } from '../src/services/userprofile/userprofile.service';
import TestCmdDto from '../src/services/userprofile/cmds/test_cmd/test_cmd.dto';
import Melon from '../src/services/melon/melon.entity';
import { CrudService } from '../../core/crud/crud.service';
import { TestUser } from '../test.utils';
import {
  CRUD_CONFIG_KEY,
  CrudConfigService,
} from '../../core/config/crud.config.service';
import { format } from 'path';
import exp from 'constants';
import Picture from '../src/services/picture/picture.entity';
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
      pictures: 10,
    },
    'Super Admin Dude': {
      email: 'superadmin.dude@mail.com',
      role: 'super_admin',
      bio: 'I am a super sys admin.',
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

  it('should ensure maximum limit when GET melon', async () => {
    const user = users['Michael Doe'];

    const payload = {};

    let query: CrudQuery = {
      service: 'melon',
      query: '{}',
    };

    let res = await testMethod({
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

    expect(res.data.length).toBe(crudConfig.limitOptions.nonAdminQueryLimit);

    query = {
      service: 'melon',
      query: '{}',
      options: JSON.stringify({
        // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
        limit: 99999999999999999999,
      }) as any,
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
      returnLimitAndTotal: true,
    });

    expect(res2.data.length).toBe(crudConfig.limitOptions.nonAdminQueryLimit);
  });

  it('should ensure limit when specified', async () => {
    const user = users['Michael Doe'];

    const payload = {};

    const query: CrudQuery = {
      service: 'melon',
      query: '{}',
      options: JSON.stringify({
        limit: 5,
      }) as any,
    };

    const res = await testMethod({
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

    expect(res.data.length).toBe(5);
  });

  it('should ensure limit when admin GET melon', async () => {
    const user = users['Admin Dude'];

    const payload = {};

    const query: CrudQuery = {
      service: 'melon',
      query: '{}',
    };

    const res = await testMethod({
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

    expect(res.data.length).toBe(crudConfig.limitOptions.adminQueryLimit);
  });

  it('should limit number of MELON per users', async () => {
    const user = users['Jon Doe'];
    const baseMelon: Partial<Melon> = {
      price: 10,
      owner: user.id,
      ownerEmail: user.email,
    };

    const query: CrudQuery = {
      service: 'melon',
    };

    const promises = [];
    for (let i = 0; i < 10; i++) {
      const payload = {
        ...baseMelon,
        name: `Melon ${i}`,
      };
      const prom = testMethod({
        url: '/crud/one',
        method: 'POST',
        expectedCode: 201,
        app,
        jwt: user.jwt,
        entityManager,
        payload,
        query,
        crudConfig,
      });
      promises.push(prom);
    }

    await Promise.all(promises);
    //50ms delay
    await new Promise((r) => setTimeout(r, 50));

    const payload = {
      ...baseMelon,
      name: `Melon too much`,
    };
    const res = await testMethod({
      url: '/crud/one',
      method: 'POST',
      expectedCode: 403,
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });

    query.query = JSON.stringify({ owner: user.id });
    //Delete melons
    const res2 = await testMethod({
      url: '/crud/many',
      method: 'DELETE',
      expectedCode: 200,
      app,
      jwt: user.jwt,
      entityManager,
      payload: {},
      query,
      crudConfig,
    });
    expect(res2).toBe(10);

    delete query.query;
    const res3 = await testMethod({
      url: '/crud/one',
      method: 'POST',
      expectedCode: 201,
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });
  });

  it('trusted user be able to create more MELONs', async () => {
    const user = users['Admin Dude'];
    const baseMelon: Partial<Melon> = {
      price: 10,
      owner: user.id,
      ownerEmail: user.email,
    };

    const query: CrudQuery = {
      service: 'melon',
    };

    const promises = [];
    for (let i = 0; i < 14; i++) {
      const payload = {
        ...baseMelon,
        name: `Melon ${i}`,
      };
      const prom = testMethod({
        url: '/crud/one',
        method: 'POST',
        expectedCode: 201,
        app,
        jwt: user.jwt,
        entityManager,
        payload,
        query,
        crudConfig,
      });
      promises.push(prom);
    }

    await Promise.all(promises);
    //50ms delay
    await new Promise((r) => setTimeout(r, 50));

    const payload = {
      ...baseMelon,
      name: `Melon too much`,
    };
    const res = await testMethod({
      url: '/crud/one',
      method: 'POST',
      expectedCode: 403,
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });

    query.query = JSON.stringify({ owner: user.id });
    //Delete melons
    const res2 = await testMethod({
      url: '/crud/many',
      method: 'DELETE',
      expectedCode: 200,
      app,
      jwt: user.jwt,
      entityManager,
      payload: {},
      query,
      crudConfig,
    });
    expect(res2).toBe(14);

    delete query.query;
    const res3 = await testMethod({
      url: '/crud/one',
      method: 'POST',
      expectedCode: 201,
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });
  });

  it('should limit number of cmd uses per user', async () => {
    const user = users['Jon Doe'];

    const payload: TestCmdDto = {
      returnMessage: 'Hello World',
    };

    const query: CrudQuery = {
      service: 'user-profile',
      cmd: 'test_cmd',
    };

    const promises = [];
    for (let i = 0; i < 10; i++) {
      const prom = testMethod({
        url: '/crud/cmd',
        method: 'POST',
        expectedCode: 201,
        app,
        jwt: user.jwt,
        entityManager,
        payload,
        query,
        crudConfig,
      });
      promises.push(prom);
    }

    await Promise.all(promises);

    //50ms delay
    await new Promise((r) => setTimeout(r, 50));

    const res = await testMethod({
      url: '/crud/cmd',
      method: 'POST',
      expectedCode: 403,
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });
  });

  it('trusted user should be able to use more cmd', async () => {
    const user = users['Admin Dude'];

    const payload: TestCmdDto = {
      returnMessage: 'Hello World',
    };

    const query: CrudQuery = {
      service: 'user-profile',
      cmd: 'test_cmd',
    };

    const promises = [];
    for (let i = 0; i < 14; i++) {
      const prom = testMethod({
        url: '/crud/cmd',
        method: 'POST',
        expectedCode: 201,
        app,
        jwt: user.jwt,
        entityManager,
        payload,
        query,
        crudConfig,
      });
      promises.push(prom);
    }

    await Promise.all(promises);

    //50ms delay
    await new Promise((r) => setTimeout(r, 50));

    const res = await testMethod({
      url: '/crud/cmd',
      method: 'POST',
      expectedCode: 403,
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });
  }, 10000);

  it('should offset and no result should be returned if offset is greater than the number of results', async () => {
    const user = users['Michael Doe'];

    const payload = {};

    const query: CrudQuery = {
      service: 'melon',
      query: JSON.stringify({ owner: user.id }),
      options: JSON.stringify({
        offset: user.melons - 1,
      }) as any,
    };

    const res = await testMethod({
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

    expect(res.data.length).toBe(1);

    query.options = JSON.stringify({
      offset: user.melons,
    }) as any;

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
      returnLimitAndTotal: true,
    });

    expect(res2.data.length).toBe(0);
  });

  it('should limit maximum number of items in DB', async () => {
    const user = users['Super Admin Dude'];

    const payload: Partial<Picture> = {
      src: 'https://www.google.com',
      width: 100,
      height: 100,
      alt: 'A picture',
      profile: user.profileId,
    };

    const query: CrudQuery = {
      service: 'picture',
    };

    await testMethod({
      url: '/crud/one',
      method: 'POST',
      expectedCode: 507,
      expectedCrudCode: CrudErrors.MAX_ITEMS_IN_DB.code,
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });
  }, 7000);
});
