import { Test, TestingModule } from '@nestjs/testing';

import {
  getModule,
  createNestApplication,
  readyApp,
  dropDatabases,
} from '../test.module';
import { CrudController } from '../../core/crud/crud.controller';
import { MyUserService } from '../myuser.service';
import { CrudAuthService } from '../../core/authentication/auth.service';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { EntityManager } from '@mikro-orm/mongodb';
import { UserProfile } from '../entities/UserProfile';
import { CrudQuery } from '../../core/crud/model/CrudQuery';
import {
  createAccountsAndProfiles,
  createNewProfileTest,
  testMethod,
} from '../test.utils';
import { MyProfileService } from '../profile.service';
import {
  CRUD_CONFIG_KEY,
  CrudConfigService,
} from '../../core/config/crud.config.service';
import { TestUser } from '../test.utils';
import { CreateAccountDto } from '../../core/config/crud-user.service';

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

  let usersWithoutProfiles: string[] = [];

  let entityManager: EntityManager;

  let crudConfig: CrudConfigService;

  const users: Record<string, TestUser> = {
    'Michael Doe': {
      email: 'michael.doe@test.com',
      role: 'super_admin',
      bio: 'BIO_FIND_KEY',
      store: profiles,
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
    const createAccountDto: CreateAccountDto = {
      logMeIn: true,
      email: testAdminCreds.email,
      password: testAdminCreds.password,
      role: 'super_admin',
    };
    const accRes = await userService.$create_account(createAccountDto, null);
    jwt = accRes.accessToken;
    userId = crudConfig.dbAdapter.formatId(accRes.userId, crudConfig);
  }, 10000);

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
    expect(res).toBe(1);

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
    expect(res2).toBe(0);

    const findRes = (await profileService.$findOne(
      { id: user.profileId },
      null,
    )) as UserProfile;
    expect(findRes.userName).toBe('PatchMy Bio');
    expect(findRes.chineseSign).toBe('Cyber Pig');
    expect(findRes.astroSign).toBeFalsy();
  });
});
