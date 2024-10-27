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
import { ICreateAccountDto } from '@eicrud/shared/interfaces';
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
      favoriteColor: 'blue',
    },
    'Sarah Doe': {
      email: 'sarah.doe@test.com',
      role: 'super_admin',
      bio: 'BIO_FIND_KEY',
      store: profiles,
      favoriteColor: 'blue',
    },
    'Jordan Doe': {
      email: 'jordan.doe@test.com',
      role: 'super_admin',
      bio: 'BIO_FIND_KEY',
      store: profiles,
      favoriteColor: 'blue',
    },
    'DelmeIn1 Doe': {
      email: 'delme.doe@test.com',
      role: 'super_admin',
      bio: 'I am about to be deleted in 1.',
      store: profilesToRemoveIn,
      favoriteColor: 'blue',
    },
    'DelmeIn2 Doe': {
      email: 'delme2.doe@test.com',
      role: 'super_admin',
      bio: 'I am about to be deleted in 2.',
      store: profilesToRemoveIn,
      favoriteColor: 'blue',
    },
    'DelmeMany1 Doe': {
      email: 'delmemany.doe@test.com',
      role: 'super_admin',
      bio: 'BIO_DELETE_KEY',
      store: profilesToRemoveMany,
      favoriteColor: 'blue',
    },
    'DelmeMany2 Doe': {
      email: 'delmemany2.doe@test.com',
      role: 'super_admin',
      bio: 'BIO_DELETE_KEY',
      store: profilesToRemoveMany,
      favoriteColor: 'blue',
    },
    'PatchmeBatch1 Doe': {
      email: 'patchmebatch@mail.com',
      role: 'super_admin',
      bio: 'Patch me please.',
      store: profilesToPatchBatch,
      favoriteColor: 'blue',
    },
    'PatchmeBatch2 Doe': {
      email: 'patchmebatch2@mail.com',
      role: 'super_admin',
      bio: 'Patch me please 2.',
      store: profilesToPatchBatch,
      favoriteColor: 'blue',
    },
    'Delme Dude': {
      email: 'delmedude@mail.com',
      role: 'super_admin',
      bio: 'Delete me please.',
      favoriteColor: 'blue',
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
  }, 10000);

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
      options: JSON.stringify({ returnUpdatedEntities: true }) as any,
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
      expectedObject,
      crudConfig,
    });
    expect(res.updated[0].userName).toBe(payload.userName);
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
      options: JSON.stringify({ returnUpdatedEntities: true }) as any,
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

    for (const resReturn of res.updated) {
      expect(resReturn.astroSign).toEqual('Aries');
      expect(resReturn.fakeProp).toBeUndefined();
      expect(resReturn.favoriteColor).toEqual('blue');
    }
  });

  //@Patch('/crud/batch')
  it('should patch batch profiles', async () => {
    const query: CrudQuery = {
      service: 'user-profile',
      options: JSON.stringify({ returnUpdatedEntities: true }) as any,
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

    for (const batch of res) {
      expect(batch.updated.length).toEqual(1);
      for (const resReturn of batch.updated) {
        expect(resReturn.astroSign).toEqual('Taurus');
        expect(resReturn.favoriteColor).toEqual('blue');
      }
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
      options: JSON.stringify({ returnUpdatedEntities: true }) as any,
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

    expect(res.count).toEqual(3);
    expect(res.updated.length).toEqual(3);
    for (const profile in profiles) {
      const resDB: any = await profileService.$findOne(
        { id: profiles[profile].id },
        null,
      );
      expect(resDB.chineseSign).toEqual('Pig');
    }
    for (const resReturn of res.updated) {
      expect(resReturn.chineseSign).toEqual('Pig');
      expect(resReturn.favoriteColor).toEqual('blue');
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
      options: JSON.stringify({ returnUpdatedEntities: true }) as any,
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
    expect(res.count).toEqual(1);
    expect(res.deleted.length).toEqual(1);

    for (const resReturn of res.deleted) {
      expect(resReturn.id).toEqual(formatedId);
      expect(resReturn.favoriteColor).toEqual('blue');
    }
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
      options: JSON.stringify({ returnUpdatedEntities: true }) as any,
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
    expect(ids.length).toBeGreaterThan(0);
    expect(res.count).toEqual(ids.length);
    expect(res.deleted.length).toEqual(ids.length);

    for (const resReturn of res.deleted) {
      expect(ids.includes(resReturn.id)).toBeTruthy();
      expect(resReturn.favoriteColor).toEqual('blue');
    }

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
      options: JSON.stringify({ returnUpdatedEntities: true }) as any,
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
    expect(res.count).toEqual(2);
    expect(res.deleted.length).toEqual(2);

    for (const resReturn of res.deleted) {
      expect(resReturn.favoriteColor).toEqual('blue');
      expect(resReturn.bio).toEqual('BIO_DELETE_KEY');
    }

    for (const profile in profilesToRemoveMany) {
      const resDb = await profileService.$findOne(
        { id: profilesToRemoveMany[profile].id },
        null,
      );
      expect(resDb).toBeNull();
    }
  });
});
