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
  createNewProfileTest,
  testMethod,
} from '../test.utils';
import { UserProfileService as MyProfileService } from '../src/services/user-profile/user-profile.service';
import {
  CRUD_CONFIG_KEY,
  CrudConfigService,
} from '../../core/config/crud.config.service';
import { TestUser } from '../test.utils';
import { ICreateAccountDto } from '../../shared/interfaces';
import { CrudError, CrudErrors } from '../../shared/CrudErrors';
import { Melon } from '../src/services/melon/melon.entity';
import { MelonService } from '../src/services/melon/melon.service';
import exp from 'constants';
const testAdminCreds = {
  email: 'admin@testmail.com',
  password: 'testpassword',
};
const timeout = Number(process.env.TEST_TIMEOUT);

describe('AppController', () => {
  let appController: CrudController;
  let userService: MyUserService;
  let authService: CrudAuthService;
  let melonService: MelonService;
  let profileService: MyProfileService;
  let jwt: string;
  let app: NestFastifyApplication;
  let userId: string;
  let profiles: Record<string, UserProfile> = {};

  let usersWithoutProfiles: string[] = [];

  let entityManager: EntityManager;

  let crudConfig: CrudConfigService;

  const users: Record<string, TestUser> = {
    'Michael Doe': {
      email: 'michael.doe@test.com',
      role: 'super_admin',
      bio: 'BIO_FIND_KEY',
      store: profiles,
      melons: 4,
    },
    'Validation Skipper': {
      email: 'Validation.Skipper@test.com',
      role: 'validation_skipper_child',
      bio: 'BIO_FIND_KEY',
      store: profiles,
      melons: 4,
    },
    'Sarah Doe': {
      email: 'sarah.doe@test.com',
      role: 'super_admin',
      bio: 'BIO_FIND_KEY',
      store: profiles,
      skipProfile: true,
    },
    'John Red': {
      email: 'John.red@test.com',
      role: 'super_admin',
      bio: 'My bio.',
      store: profiles,
      favoriteColor: 'red',
    },
    'RemoveMy Bio': {
      email: 'RemoveMy.Bio@test.com',
      role: 'super_admin',
      bio: 'My bio.',
      store: profiles,
      favoriteColor: 'red',
    },
    'ChangeMy Bio': {
      email: 'ChangeMy.Bio@test.com',
      role: 'super_admin',
      bio: 'My bio.',
      store: profiles,
      favoriteColor: 'red',
    },
    'PatchMy Bio': {
      email: 'PatchMy.Bio@test.com',
      role: 'super_admin',
      bio: 'My bio.',
      store: profiles,
      favoriteColor: 'red',
    },
    'Create Profile': {
      email: 'Create.Profile@test.com',
      role: 'super_admin',
      bio: 'My bio.',
      store: profiles,
      favoriteColor: 'red',
      skipProfile: true,
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
    melonService = app.get<MelonService>(MelonService);

    profileService = app.get<MyProfileService>(MyProfileService);
    entityManager = app.get<EntityManager>(EntityManager);

    await createAccountsAndProfiles(users, userService, crudConfig, {
      usersWithoutProfiles,
      testAdminCreds,
    });
    const createAccountDto: ICreateAccountDto = {
      logMeIn: true,
      email: testAdminCreds.email,
      password: testAdminCreds.password,
      role: 'super_admin',
    };
    const accRes = await userService.$create_account(createAccountDto, null);
    jwt = accRes.accessToken;
    userId = crudConfig.dbAdapter.formatId(accRes.userId, crudConfig);
  }, timeout*2);

  //@Post('/crud/one')
  it('should not allow duplicate username @Unique()', async () => {
    const user = users['Sarah Doe'];
    const payload: Partial<UserProfile> = {
      userName: 'Michael Doe',
      user: user.id,
      bio: 'I am a cool guy.',
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
    };

    await createNewProfileTest(
      app,
      jwt,
      entityManager,
      payload,
      query,
      crudConfig,
      500,
    );
  });

  it('create should add default values, and unknown value should be removed', async () => {
    const payload: Partial<UserProfile> = {
      userName: 'John Doe',
      user: userId,
      bio: 'I am a cool guy.',
      address: {
        // This should be removed
        street: '1234 Elm St.',
        city: 'Springfield',
      },
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
    };

    await testMethod({
      url: '/crud/one',
      method: 'POST',
      expectedCode: 400,
      app,
      jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });
    delete (payload as any).address;
    const res = await testMethod({
      url: '/crud/one',
      method: 'POST',
      expectedCode: 201,
      app,
      jwt: jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });

    let resDb = (await profileService.$findOne(
      { id: res[crudConfig.id_field] },
      null,
    )) as UserProfile;
    resDb = JSON.parse(JSON.stringify(res));
    expect(res.address).toBeUndefined();
    expect((resDb as any).address).toBeUndefined();
    expect(res.favoriteColor).toEqual('blue');
    expect(resDb.favoriteColor).toEqual('blue');
    return res;
  });

  it('patch should not modify unprovided default values, and unknown value should be removed', async () => {
    const user: Partial<TestUser> = users['John Red'];

    const payload: Partial<UserProfile> = {
      userName: 'John Green',
      fakeField: 'fake',
    } as any;
    const formatedId = crudConfig.dbAdapter.formatId(
      user.profileId,
      crudConfig,
    );
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: formatedId }),
    };

    const expectedObject = {
      ...payload,
      bio: user.bio,
    };
    delete (expectedObject as any).fakeField;

    const fetchEntity = { entity: UserProfile, id: user.profileId };

    await testMethod({
      url: '/crud/one',
      method: 'PATCH',
      app,
      jwt,
      entityManager,
      payload,
      query,
      expectedCode: 400,
      fetchEntity: null,
      expectedObject: null,
      crudConfig,
    });
    delete (payload as any).fakeField;
    let res = await testMethod({
      url: '/crud/one',
      method: 'PATCH',
      app,
      jwt,
      entityManager,
      payload,
      query,
      expectedCode: 200,
      fetchEntity,
      expectedObject,
      crudConfig,
    });
    expect(res.userName).toEqual('John Green');
    expect(res.fakeField).toBeUndefined();
    expect(res.favoriteColor).toEqual('red');
  });

  it('service $patch with undefined value should not affect existing value', async () => {
    const user: Partial<TestUser> = users['RemoveMy Bio'];

    await profileService.$patchOne(
      { id: user.profileId },
      { bio: undefined },
      null,
    );

    const findRes = (await profileService.$findOne(
      { id: user.profileId },
      null,
    )) as UserProfile;
    expect(findRes.userName).toBe('RemoveMy Bio');
    expect(findRes.bio).toBe(user.bio);
  });

  it('$patchOne should throw if limiting fields do not match', async () => {
    const user: Partial<TestUser> = users['ChangeMy Bio'];

    const payload: Partial<UserProfile> = {
      bio: undefined,
    } as any;
    const formatedId = crudConfig.dbAdapter.formatId(
      user.profileId,
      crudConfig,
    );
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: formatedId }),
    };

    const expectedObject = {};

    const fetchEntity = null;

    await testMethod({
      url: '/crud/one',
      method: 'PATCH',
      app,
      jwt,
      entityManager,
      payload,
      query,
      expectedCode: 200,
      fetchEntity,
      expectedObject,
      crudConfig,
    });

    query.query = JSON.stringify({ id: formatedId, astroSign: 'Titan5892' });

    await testMethod({
      url: '/crud/one',
      method: 'PATCH',
      app,
      jwt,
      entityManager,
      payload,
      query,
      expectedCode: 400,
      fetchEntity,
      expectedObject,
      crudConfig,
    });
  });

  it("patch many shouldn't patch if limiting fields do not match", async () => {
    const user: Partial<TestUser> = users['PatchMy Bio'];

    let payload: Partial<UserProfile> = {
      chineseSign: 'Cyber Pig',
    } as any;
    const formatedId = crudConfig.dbAdapter.formatId(
      user.profileId,
      crudConfig,
    );
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: formatedId }),
    };

    const expectedObject = {};

    const fetchEntity = null;

    const res = await testMethod({
      url: '/crud/many',
      method: 'PATCH',
      app,
      jwt,
      entityManager,
      payload,
      query,
      expectedCode: 200,
      fetchEntity,
      expectedObject,
      crudConfig,
    });
    expect(res.count).toBe(1);

    query.query = JSON.stringify({
      id: formatedId,
      bio: 'impossible bio 45azalmdq2qs',
    });
    payload = { astroSign: 'Titan5892' };
    const res2 = await testMethod({
      url: '/crud/many',
      method: 'PATCH',
      app,
      jwt,
      entityManager,
      payload,
      query,
      expectedCode: 200,
      fetchEntity,
      expectedObject,
      crudConfig,
    });
    expect(res2.count).toBe(0);

    const findRes = (await profileService.$findOne(
      { id: user.profileId },
      null,
    )) as UserProfile;
    expect(findRes.userName).toBe('PatchMy Bio');
    expect(findRes.chineseSign).toBe('Cyber Pig');
    expect(findRes.astroSign).toBeFalsy();
  });

  it('Should be able to set ID before creating a new entity', async () => {
    const user = users['Create Profile'];

    const id = userService.dbAdapter.createId(crudConfig);
    const payload: Partial<UserProfile> = {
      id,
      userName: 'Create Profile',
      user: user.id,
      bio: 'I am a cool guy.',
    } as any;

    const query: CrudQuery = {
      service: 'user-profile',
    };

    await testMethod({
      url: '/crud/one',
      method: 'POST',
      expectedCode: 400,
      expectedCrudCode: CrudErrors.ID_OVERRIDE_NOT_SET.code,
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });

    query.options = JSON.stringify({ allowIdOverride: true }) as any;

    const res = await testMethod({
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

    expect(res.id).toBe(id);

    //Should prevent primary key override
    payload.id = users['Michael Doe'].profileId;

    query.query = JSON.stringify({ id: res.id });
    const newPayload = { id: payload.id, userName: 'Test Profile' };
    const res2 = await testMethod({
      url: '/crud/one',
      method: 'PATCH',
      expectedCode: 400,
      expectedCrudCode: CrudErrors.CANNOT_UPDATE_ID.code,
      app,
      jwt: user.jwt,
      entityManager,
      payload: newPayload,
      query,
      crudConfig,
    });

    newPayload.id = userService.dbAdapter.createId(crudConfig);
    newPayload.userName = 'Test Profile 2';

    const res3 = await testMethod({
      url: '/crud/many',
      method: 'PATCH',
      expectedCode: 400,
      expectedCrudCode: CrudErrors.CANNOT_UPDATE_ID.code,
      app,
      jwt: user.jwt,
      entityManager,
      payload: newPayload,
      query,
      crudConfig,
    });
  });

  it('Should expose mikro-orm query operators if skipQueryValidationForRoles is enabled', async () => {
    const user = users['Validation Skipper'];

    const qry: Partial<Melon> = {
      owner: user.id,
    };

    const query: CrudQuery = {
      service: 'melon',
      query: JSON.stringify(qry),
    };

    const method = (usr, q, expectedCode = 200) => {
      return testMethod({
        url: '/crud/many',
        method: 'GET',
        expectedCode,
        app,
        jwt: usr.jwt,
        entityManager,
        payload: {},
        query: q,
        crudConfig,
      });
    };

    const res = await method(user, query);

    expect(res.length).toBe(user.melons);

    qry.price = { $lt: 2 } as any;
    query.query = JSON.stringify(qry);

    const res2 = await method(user, query);

    expect(res2.length).toBe(2);

    const userWithValidations = users['Michael Doe'];

    await method(userWithValidations, query, 400);

    const payload: Partial<Melon> = {
      name: 'Melon Updated',
    };

    query.query = JSON.stringify(qry);

    const updateMethod = (usr, q, pld, expectedCode = 200) => {
      return testMethod({
        url: '/crud/many',
        method: 'PATCH',
        expectedCode,
        app,
        jwt: usr.jwt,
        entityManager,
        payload: pld,
        query: q,
        crudConfig,
      });
    };

    await updateMethod(user, query, payload, 200);

    const userMelons = await melonService.$find({ owner: user.id }, null);
    expect(userMelons.data.length).toBe(user.melons);
    for (const melon of userMelons.data) {
      if (melon.price > 1) {
        expect(melon.name).not.toBe('Melon Updated');
      } else {
        expect(melon.name).toBe('Melon Updated');
      }
    }

    const resDelete = await testMethod({
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

    expect(resDelete.count).toBe(2);

    const userMelons2 = await melonService.$find({ owner: user.id }, null);
    expect(userMelons2.data.length).toBe(user.melons - 2);
  });
});
