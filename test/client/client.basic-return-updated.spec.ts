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
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager } from '@mikro-orm/core';
import { UserProfile } from '../src/services/user-profile/user-profile.entity';
import {
  createAccountsAndProfiles,
  createMelons,
  createNewProfileTest,
  parseJwtCookieFromRes,
  testMethod,
} from '../test.utils';
import { UserProfileService as MyProfileService } from '../src/services/user-profile/user-profile.service';
import { Melon } from '../src/services/melon/melon.entity';
import { TestUser } from '../test.utils';
import {
  CRUD_CONFIG_KEY,
  CrudConfigService,
} from '@eicrud/core/config/crud.config.service';
import { CrudAuthGuard } from '@eicrud/core/authentication/auth.guard';
import {
  ClientConfig,
  CrudClient,
  MemoryStorage,
} from '@eicrud/client/CrudClient';
import { LoginDto } from '@eicrud/core/config/basecmd_dtos/user/login.dto';
import { MelonService } from '../src/services/melon/melon.service';
import exp from 'constants';
import { MyUser } from '../src/services/my-user/my-user.entity';

const testAdminCreds = {
  email: 'admin@testmail.com',
  password: 'testpassword',
};

const users: Record<string, TestUser> = {
  'Michael Doe': {
    email: 'michael.doe@test.com',
    role: 'user',
    bio: 'I am Michael Doe, a cool guy! ',
    melons: 1000,
  },
  'Jon Doe': {
    email: 'jon.doe@test.com',
    role: 'user',
    bio: 'I am a cool guy.',
    melons: 5,
  },
  'Jon Dae': {
    email: 'jon.Dae@test.com',
    role: 'user',
    bio: 'I am a cool guy.',
    melons: 5,
  },
  'Admin Dude': {
    email: 'admin.dude@mail.com',
    role: 'admin',
    bio: 'I am a sys admin.',
    profileType: 'admin',
  },
  'Melon Many': {
    email: 'melon.many@test.com',
    role: 'user',
    bio: 'I am a cool guy.',
    melons: 7,
  },
  'Giveme Melons': {
    email: 'Giveme.Melons@test.com',
    role: 'trusted_user',
    bio: 'I am a cool guy.',
  },
  'Patchmy Melons': {
    email: 'PatchMy.Melons@test.com',
    role: 'trusted_user',
    bio: 'I am a cool guy.',
    melons: 44,
  },
  'Logme Out': {
    email: 'Logme.Out@test.com',
    role: 'user',
    bio: 'I am leaving.',
  },
  'Renew Me': {
    email: 'Renew.Me@test.com',
    role: 'user',
    bio: 'I am staying.',
  },
};

describe('AppController', () => {
  let appController: CrudController;
  let userService: MyUserService;
  let authService: CrudAuthService;
  let melonService: MelonService;
  let authGuard: CrudAuthGuard;
  let profileService: MyProfileService;
  let app: NestFastifyApplication;

  let entityManager: EntityManager;

  let crudConfig: CrudConfigService;
  const baseName = require('path').basename(__filename);

  const port = 2995;

  const clientConfig = (): ClientConfig => {
    return {
      url: 'http://127.0.0.1:' + port,
      serviceName: 'user-profile',
      storage: new MemoryStorage(),
      userServiceName: 'my-user',
    } as ClientConfig;
  };

  const getProfileClient = (): CrudClient<UserProfile> =>
    new CrudClient({ ...clientConfig(), serviceName: 'user-profile' });
  const getMelonClient = (): CrudClient<Melon> =>
    new CrudClient({ ...clientConfig(), serviceName: 'melon' });

  beforeAll(async () => {
    const module = getModule(baseName);
    const moduleRef: TestingModule =
      await Test.createTestingModule(module).compile();

    await dropDatabases(moduleRef);

    app = createNestApplication(moduleRef);

    await app.init();
    await readyApp(app);

    appController = app.get<CrudController>(CrudController);
    userService = app.get<MyUserService>(MyUserService);
    authService = app.get<CrudAuthService>(CrudAuthService);
    authGuard = authService._authGuard;
    profileService = app.get<MyProfileService>(MyProfileService);
    entityManager = app.get<EntityManager>(EntityManager);
    crudConfig = app.get<CrudConfigService>(CRUD_CONFIG_KEY, { strict: false });
    melonService = app.get<MelonService>(MelonService);

    crudConfig.authenticationOptions.minTimeBetweenLoginAttempsMs = 0;
    crudConfig.watchTrafficOptions.ddosProtection = false;

    await createAccountsAndProfiles(users, userService, crudConfig, {
      testAdminCreds,
    });

    await app.listen(port);
  });

  //@Patch('one')
  it('should patch and delete one profile', async () => {
    const username = 'Jon Doe';
    const user = users[username];
    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password,
    };
    const myClient = getProfileClient();

    //wait 600ms
    await new Promise((resolve) => setTimeout(resolve, 600));
    await myClient.login(dto);

    const patch: Partial<UserProfile> = {
      astroSign: 'Aries',
    };

    const res1 = await myClient.patchOne(
      { id: user.profileId, user: user.id },
      patch,
      { returnUpdatedEntity: true },
    );
    expect(res1.count).toBe(1);
    expect(res1.updated.astroSign).toBe(patch.astroSign);
    expect(res1.updated.userName).toBe(username);

    const profile: UserProfile = await myClient.findOne({
      id: user.profileId,
      user: user.id,
    });

    expect(profile.astroSign).toBe(patch.astroSign);

    const res2 = await myClient.deleteOne(
      {
        id: user.profileId,
        user: user.id,
      },
      { returnUpdatedEntity: true },
    );

    expect(res2.count).toBe(1);
    expect(res2.deleted.astroSign).toBe(patch.astroSign);
    expect(res2.deleted.userName).toBe(username);

    const missingProfile: UserProfile = await myClient.findOne({
      id: user.profileId,
      user: user.id,
    });

    expect(missingProfile).toBeFalsy();
  });
});
