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
import exp from 'constants';
import { ICreateAccountDto } from '../../shared/interfaces';
import { timeout } from "../env";

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
    },
    'Jordan Doe': {
      email: 'jordan.doe@test.com',
      role: 'super_admin',
      bio: 'BIO_FIND_KEY',
      store: profiles,
    },
    'DelmeIn1 Doe': {
      email: 'delme.doe@test.com',
      role: 'super_admin',
      bio: 'I am about to be deleted in 1.',
      store: profilesToRemoveIn,
    },
    'DelmeIn2 Doe': {
      email: 'delme2.doe@test.com',
      role: 'super_admin',
      bio: 'I am about to be deleted in 2.',
      store: profilesToRemoveIn,
    },
    'DelmeMany1 Doe': {
      email: 'delmemany.doe@test.com',
      role: 'super_admin',
      bio: 'BIO_DELETE_KEY',
      store: profilesToRemoveMany,
    },
    'DelmeMany2 Doe': {
      email: 'delmemany2.doe@test.com',
      role: 'super_admin',
      bio: 'BIO_DELETE_KEY',
      store: profilesToRemoveMany,
    },
    'PatchmeBatch1 Doe': {
      email: 'patchmebatch@mail.com',
      role: 'super_admin',
      bio: 'Patch me please.',
      store: profilesToPatchBatch,
    },
    'PatchmeBatch2 Doe': {
      email: 'patchmebatch2@mail.com',
      role: 'super_admin',
      bio: 'Patch me please 2.',
      store: profilesToPatchBatch,
    },
    'NoProfile1 Doe': {
      email: 'noProfileDude1Doe@test.com',
      role: 'super_admin',
      bio: 'I have no profile.',
      skipProfile: true,
    },
    'NoProfile2 Doe': {
      email: 'noProfileDude2Doe@test.com',
      role: 'super_admin',
      bio: 'I have no profile. 2',
      skipProfile: true,
    },
    'Delme Dude': {
      email: 'delmedude@mail.com',
      role: 'super_admin',
      bio: 'Delete me please.',
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
  }, timeout*2);

  //@Post('/crud/one')
  it('should create a new profile', async () => {
    const payload: Partial<UserProfile> = {
      userName: 'John Doe',
      user: userId,
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
    );
  });

  //@Post('/crud/batch')
  it('should create batch new profiles', async () => {
    const query: CrudQuery = {
      service: 'user-profile',
    };

    const payloadArray = [];

    let i = 0;
    for (let id of usersWithoutProfiles) {
      i++;
      payloadArray.push({
        userName: `Batch Doe ${i}`,
        user: id,
        bio: `I am a batch created ${i}.`,
      });
    }

    const payload: any = payloadArray;

    const expectedObject = null;

    const res = await testMethod({
      url: '/crud/batch',
      method: 'POST',
      app,
      jwt,
      entityManager,
      payload,
      query,
      expectedCode: 201,
      expectedObject,
      crudConfig,
    });

    expect(res?.length).toEqual(usersWithoutProfiles?.length);
    i = 0;
    for (const profile in res) {
      i++;
      const res2 = await profileService.$findOne({ id: res[profile].id }, null);
      expect(res2.userName).toEqual(`Batch Doe ${i}`);
    }
  });

  //@Get('/crud/one')
  it('should find one profile by user', async () => {
    const sarahDoeProfile = profiles['Sarah Doe'];
    const payload: Partial<UserProfile> = {} as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({
        user: crudConfig.dbAdapter.formatId(
          (sarahDoeProfile.user as any).id,
          crudConfig,
        ),
      }),
    };

    const expectedObject = {
      bio: sarahDoeProfile.bio,
    };

    return testMethod({
      url: '/crud/one',
      method: 'GET',
      app,
      jwt,
      entityManager,
      payload,
      query,
      expectedCode: 200,
      expectedObject,
      crudConfig,
    });
  });

  it('should find many with empty query', async () => {
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({}),
    };

    const expectedObject = null;

    const res = await testMethod({
      url: '/crud/many',
      method: 'GET',
      app,
      jwt,
      entityManager,
      payload: null,
      query,
      expectedCode: 200,
      expectedObject,
      crudConfig,
    });

    expect(res.length).toBeGreaterThan(3);
  });
  //Get('/crud/many')
  it('should find many profiles by bio', async () => {
    const payload: Partial<UserProfile> = {} as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ bio: 'BIO_FIND_KEY' }),
    };

    const expectedObject = null;

    const res = await testMethod({
      url: '/crud/many',
      method: 'GET',
      app,
      jwt,
      entityManager,
      payload,
      query,
      expectedCode: 200,
      expectedObject,
      crudConfig,
    });

    expect(res.length).toEqual(3);
    for (const profile in res) {
      expect(res[profile].bio).toEqual('BIO_FIND_KEY');
    }
  });

  //@Get('/crud/in')
  it('should find in profiles', async () => {
    const payload: Partial<UserProfile> = {} as any;
    const ids = [];
    for (const key in profiles) {
      const formatedId = crudConfig.dbAdapter.formatId(
        profiles[key].id,
        crudConfig,
      );
      ids.push(formatedId);
    }
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: ids }),
    };

    const expectedObject = null;

    const res = await testMethod({
      url: '/crud/in',
      method: 'GET',
      app,
      jwt,
      entityManager,
      payload,
      query,
      expectedCode: 200,
      expectedObject,
      crudConfig,
    });

    expect(res.length).toEqual(ids.length);
    expect(res[0].userName).toBeDefined();
    expect(res[0].id).toBeDefined();
  });

  //@Patch('/crud/one')
  it('should patch a profile', async () => {
    const sarahDoeProfile = profiles['Sarah Doe'];
    const payload: Partial<UserProfile> = {
      userName: 'Sarah Jane',
      user: crudConfig.dbAdapter.formatId(
        (sarahDoeProfile.user as any).id,
        crudConfig,
      ),
    } as any;
    const formatedId = crudConfig.dbAdapter.formatId(
      sarahDoeProfile.id,
      crudConfig,
    );
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: '507f191e810c19729de860ea' }), //fake id
    };

    // should throw if entity not found
    await testMethod({
      url: '/crud/one',
      method: 'PATCH',
      app,
      jwt,
      entityManager,
      payload,
      query,
      expectedCode: 400,
      crudConfig,
    });

    const expectedObject = {
      ...payload,
      bio: sarahDoeProfile.bio,
    };

    const fetchEntity = {
      entity: UserProfile,
      id: sarahDoeProfile.id?.toString(),
    };

    query.query = JSON.stringify({ id: formatedId });

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
    expect(res.userName).toBeDefined();
  });

  //@Patch('/crud/in')
  it('should patch in profiles', async () => {
    const payload: any = {
      astroSign: 'Aries',
      fakeProp: 'fake',
    };
    const ids = [];
    for (const key in profiles) {
      const formatedId = crudConfig.dbAdapter.formatId(
        profiles[key].id,
        crudConfig,
      );
      ids.push(formatedId);
    }
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: ids }),
    };

    const expectedObject = null;

    await testMethod({
      url: '/crud/in',
      method: 'PATCH',
      app,
      jwt,
      entityManager,
      payload,
      query,
      expectedCode: 400,
      expectedObject,
      crudConfig,
    });

    delete payload.fakeProp;

    const res = await testMethod({
      url: '/crud/in',
      method: 'PATCH',
      app,
      jwt,
      entityManager,
      payload,
      query,
      expectedCode: 200,
      expectedObject,
      crudConfig,
    });

    expect(res?.count).toEqual(ids.length);
    for (const profile in profiles) {
      const resDB: any = await profileService.$findOne(
        { id: profiles[profile].id },
        null,
      );
      expect(resDB.astroSign).toEqual('Aries');
    }
  });

  //@Patch('/crud/batch')
  it('should patch batch profiles', async () => {
    const query: CrudQuery = {
      service: 'user-profile',
    };

    const payloadArray = [];

    for (const key in profilesToPatchBatch) {
      payloadArray.push({
        query: { id: profilesToPatchBatch[key].id },
        data: { astroSign: 'Taurus', fakeProp: 'fake' },
      });
    }

    const payload: any = payloadArray;

    const expectedObject = null;

    await testMethod({
      url: '/crud/batch',
      method: 'PATCH',
      app,
      jwt,
      entityManager,
      payload,
      query,
      expectedCode: 400,
      expectedObject,
      crudConfig,
    });

    payloadArray.forEach((p: any) => delete p.data.fakeProp);

    const res = await testMethod({
      url: '/crud/batch',
      method: 'PATCH',
      app,
      jwt,
      entityManager,
      payload,
      query,
      expectedCode: 200,
      expectedObject,
      crudConfig,
    });

    expect(res?.length).toEqual(2);
    for (const profile in profilesToPatchBatch) {
      const resDB: any = await profileService.$findOne(
        { id: profilesToPatchBatch[profile].id },
        null,
      );
      expect(resDB.astroSign).toEqual('Taurus');
    }
  });

  //@Patch('/crud/many')
  it('should patch many profiles', async () => {
    const payload: any = {
      chineseSign: 'Pig',
      fakeProp: 'fake',
    };
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ bio: 'BIO_FIND_KEY' }),
    };

    const expectedObject = null;

    await testMethod({
      url: '/crud/many',
      method: 'PATCH',
      app,
      jwt,
      entityManager,
      payload,
      query,
      expectedCode: 400,
      expectedObject,
      crudConfig,
    });

    delete payload.fakeProp;

    const res = await testMethod({
      url: '/crud/many',
      method: 'PATCH',
      app,
      jwt,
      entityManager,
      payload,
      query,
      expectedCode: 200,
      expectedObject,
      crudConfig,
    });

    expect(res?.count).toEqual(3);
    for (const profile in profiles) {
      const resDB: any = await profileService.$findOne(
        { id: profiles[profile].id },
        null,
      );
      expect(resDB.chineseSign).toEqual('Pig');
    }
  });

  //@Delete('/crud/one')
  it('should delete profile', async () => {
    const payload: Partial<UserProfile> = {} as any;
    const formatedId = crudConfig.dbAdapter.formatId(
      users['Delme Dude'].profileId,
      crudConfig,
    );
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: formatedId }),
    };

    const expectedObject = null;

    const res = await testMethod({
      url: '/crud/one',
      method: 'DELETE',
      app,
      jwt,
      entityManager,
      payload,
      query,
      expectedCode: 200,
      expectedObject,
      crudConfig,
    });
    expect(res?.count).toEqual(1);

    const resDb = await profileService.$findOne(
      { id: users['Delme Dude'].id },
      null,
    );
    expect(resDb).toBeNull();
  });

  //@Delete('/crud/in')
  it('should delete in profiles', async () => {
    const payload: Partial<UserProfile> = {} as any;
    const ids = [];
    for (const key in profilesToRemoveIn) {
      const formatedId = crudConfig.dbAdapter.formatId(
        profilesToRemoveIn[key].id,
        crudConfig,
      );
      ids.push(formatedId);
    }
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: ids }),
    };

    const expectedObject = null;

    const res = await testMethod({
      url: '/crud/in',
      method: 'DELETE',
      app,
      jwt,
      entityManager,
      payload,
      query,
      expectedCode: 200,
      expectedObject,
      crudConfig,
    });
    expect(res?.count).toEqual(ids.length);

    for (const profile in profilesToRemoveIn) {
      const resDb = await profileService.$findOne(
        { id: profilesToRemoveIn[profile].id },
        null,
      );
      expect(resDb).toBeNull();
    }
  });

  //@Delete('/crud/many')
  it('should delete many profiles', async () => {
    const payload: Partial<UserProfile> = {} as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ bio: 'BIO_DELETE_KEY' }),
    };

    const expectedObject = null;

    const res = await testMethod({
      url: '/crud/many',
      method: 'DELETE',
      app,
      jwt,
      entityManager,
      payload,
      query,
      expectedCode: 200,
      expectedObject,
      crudConfig,
    });
    expect(res?.count).toEqual(2);

    for (const profile in profilesToRemoveMany) {
      const resDb = await profileService.$findOne(
        { id: profilesToRemoveMany[profile].id },
        null,
      );
      expect(resDb).toBeNull();
    }
  });
});
