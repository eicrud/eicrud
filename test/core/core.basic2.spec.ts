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
import { CrudOptions } from '@eicrud/core/crud/model/CrudOptions';
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
    'John Smith': {
      email: 'john.smith@test.com',
      role: 'user',
      bio: 'bio for John',
      store: profiles,
    },
    'Alice Johnson': {
      email: 'alice.johnson@test.com',
      role: 'admin',
      bio: 'Alice loves testing',
      store: profiles,
    },
    'Bob Lee': {
      email: 'bob.lee@test.com',
      role: 'user',
      bio: 'Bob is a test user',
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

      expect(find.user).toEqual(userId);
    },
    7000 * 100,
  );

  it("should patch Sarah's friends using PATCH ONE method", async () => {
    const sarahProfile = profiles['Sarah Doe2'];
    const johnProfile = profiles['John Smith'];
    const aliceProfile = profiles['Alice Johnson'];

    // Get the user IDs to add as friends
    const johnUserId = crudConfig.dbAdapter.formatId(
      (johnProfile.user as any).id,
      crudConfig,
    );
    const aliceUserId = crudConfig.dbAdapter.formatId(
      (aliceProfile.user as any).id,
      crudConfig,
    );

    const payload: Partial<UserProfile> = {
      friends: [johnUserId, aliceUserId],
    } as any;

    const formatedId = crudConfig.dbAdapter.formatId(
      sarahProfile.id,
      crudConfig,
    );

    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: formatedId }),
    };

    const res = await testMethod({
      url: '/crud/one',
      method: 'PATCH',
      app,
      jwt,
      entityManager,
      payload,
      query,
      expectedCode: 200,
      crudConfig,
    });

    // Verify that Sarah's profile now has the friends
    const sarahUserId = crudConfig.dbAdapter.formatId(
      (sarahProfile.user as any).id,
      crudConfig,
    );

    const queryGet = {
      service: 'user-profile',
      query: JSON.stringify({ user: sarahUserId }),
      options: JSON.stringify({
        populate: ['friends'],
      } as CrudOptions),
    };

    const updatedProfile = await testMethod({
      url: '/crud/one',
      method: 'GET',
      app,
      jwt,
      entityManager,
      payload: {},
      query: queryGet,
      expectedCode: 200,
      crudConfig,
    });

    expect(updatedProfile.friends).toBeDefined();
    expect(Array.isArray(updatedProfile.friends)).toBe(true);
    expect(updatedProfile.friends).toHaveLength(2);

    // Now fetch with populate to check friend emails
    const queryGetPopulated = {
      service: 'user-profile',
      query: JSON.stringify({ user: sarahUserId }),
      options: JSON.stringify({
        populate: ['friends'],
      } as CrudOptions),
    };

    const populatedProfile = await testMethod({
      url: '/crud/one',
      method: 'GET',
      app,
      jwt,
      entityManager,
      payload: {},
      query: queryGetPopulated,
      expectedCode: 200,
      crudConfig,
    });

    expect(populatedProfile.friends).toBeDefined();
    expect(Array.isArray(populatedProfile.friends)).toBe(true);
    expect(populatedProfile.friends).toHaveLength(2);

    // Check that the populated friends have the correct emails
    const friendEmails = populatedProfile.friends
      .map((friend: any) => friend.email)
      .sort();
    const expectedEmails = [
      'john.smith@test.com',
      'alice.johnson@test.com',
    ].sort();
    expect(friendEmails).toEqual(expectedEmails);
  }, 7000);

  it("should patch Bob Lee's friends using PATCH MANY method", async () => {
    if (process.env.TEST_CRUD_DB == 'postgre') {
      //Can't update manyToMany in postgre without providing primary key
      return;
    }

    const bobProfile = profiles['Bob Lee'];
    const johnProfile = profiles['John Smith'];
    const aliceProfile = profiles['Alice Johnson'];

    // Get the user IDs to add as friends
    const johnUserId = crudConfig.dbAdapter.formatId(
      (johnProfile.user as any).id,
      crudConfig,
    );
    const aliceUserId = crudConfig.dbAdapter.formatId(
      (aliceProfile.user as any).id,
      crudConfig,
    );

    const payload: Partial<UserProfile> = {
      friends: [johnUserId, aliceUserId],
    } as any;

    const bobUserId = crudConfig.dbAdapter.formatId(
      (bobProfile.user as any).id,
      crudConfig,
    );

    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ user: bobUserId }),
    };

    const res = await testMethod({
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

    expect(res?.count).toEqual(1);

    // Verify that Bob's profile now has the friends
    const queryGet: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ user: bobUserId }),
    };

    const updatedProfile = await testMethod({
      url: '/crud/one',
      method: 'GET',
      app,
      jwt,
      entityManager,
      payload: {},
      query: queryGet,
      expectedCode: 200,
      crudConfig,
    });

    expect(updatedProfile.friends).toBeDefined();
    expect(Array.isArray(updatedProfile.friends)).toBe(true);
    expect(updatedProfile.friends).toHaveLength(2);

    // Now fetch with populate to check friend emails
    const queryGetPopulated = {
      service: 'user-profile',
      query: JSON.stringify({ user: bobUserId }),
      options: JSON.stringify({
        populate: ['friends'],
      } as CrudOptions),
    };

    const populatedProfile = await testMethod({
      url: '/crud/one',
      method: 'GET',
      app,
      jwt,
      entityManager,
      payload: {},
      query: queryGetPopulated,
      expectedCode: 200,
      crudConfig,
    });

    expect(populatedProfile.friends).toBeDefined();
    expect(Array.isArray(populatedProfile.friends)).toBe(true);
    expect(populatedProfile.friends).toHaveLength(2);

    // Check that the populated friends have the correct emails
    const friendEmails = populatedProfile.friends
      .map((friend: any) => friend.email)
      .sort();
    const expectedEmails = [
      'john.smith@test.com',
      'alice.johnson@test.com',
    ].sort();
    expect(friendEmails).toEqual(expectedEmails);
  }, 7000);
});
