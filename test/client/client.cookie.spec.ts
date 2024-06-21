import { Test, TestingModule } from '@nestjs/testing';

import {
  getModule,
  createNestApplication,
  readyApp,
  dropDatabases,
} from '../src/app.module';
import { CrudController } from '@eicrud/core/crud/crud.controller';
import { MyUserService } from '../src/services/myuser/myuser.service';
import { CrudAuthService } from '@eicrud/core/authentication/auth.service';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager } from '@mikro-orm/mongodb';
import UserProfile from '../src/services/userprofile/userprofile.entity';
import {
  createAccountsAndProfiles,
  createMelons,
  createNewProfileTest,
  extractAndSetCRSF,
  parseJwtCookieFromRes,
  testMethod,
} from '../test.utils';
import { UserProfileService as MyProfileService } from '../src/services/userprofile/userprofile.service';
import Melon from '../src/services/melon/melon.entity';
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
} from '../../client/CrudClient';
import { LoginDto } from '@eicrud/core/crud/model/dtos';
import { MelonService } from '../src/services/melon/melon.service';
import exp from 'constants';
import MyUser from '../src/services/myuser/myuser.entity';

const testAdminCreds = {
  email: 'admin@testmail.com',
  password: 'testpassword',
};

const users: Record<string, TestUser> = {
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
  'CSRF Dude': {
    email: 'CSRF.Dude@test.com',
    role: 'user',
    bio: 'I am staying.',
  },
};

const port = 2999;

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

    await createAccountsAndProfiles(users, userService, crudConfig, {
      testAdminCreds,
    });

    await app.listen(port);
  });

  it('should logout with cookie', async () => {
    const user = users['Logme Out'];

    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password,
    };

    const myClient = getProfileClient();

    await myClient.login(dto);

    const res = await myClient.checkJwt();
    expect(res).toEqual(user.id?.toString());

    myClient.config.storage = null;
    const res2 = await myClient.logout();

    const matchLogout = parseJwtCookieFromRes(
      res2,
      /eicrud-jwt=; Max-Age=([^;]*);/,
    );
    expect(matchLogout).toBeTruthy();
    expect(matchLogout[1]).toBe('0');
  });

  it('should renew jwt with cookie', async () => {
    const user = users['Renew Me'];
    const myClient = getProfileClient();
    myClient.config.globalOptions = { jwtCookie: true };

    // myClient.config.onLogout = () => {
    //   myClient.config.globalHeaders = null;
    // }

    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password,
      expiresInSec: 4,
    };
    const raw = await myClient.login(dto, true);
    extractAndSetCRSF(raw, myClient);

    const profile: UserProfile = await myClient.findOne({
      id: user.profileId,
      user: user.id,
    });
    expect(profile.bio).toBe(user.bio);

    //wait 4000ms
    await new Promise((resolve) => setTimeout(resolve, 4000));

    let error;
    try {
      await myClient.findOne({
        id: user.profileId,
        user: user.id,
      });
    } catch (e) {
      console.log(e.response.data);
      error = e.response.status;
    }
    expect(error).toBe(403);

    dto.expiresInSec = 4;
    const raw2 = await myClient.login(dto, true);
    extractAndSetCRSF(raw2, myClient);
    const resLog = raw2.data;

    expect(resLog.userId).toEqual(user.id?.toString());

    await new Promise((resolve) => setTimeout(resolve, 2000));
    const res = await myClient.userServiceCmd('check_jwt', {}, true);
    const match = parseJwtCookieFromRes(res);
    expect(match).toBeTruthy();
    myClient.setJwt(match[1]);
    extractAndSetCRSF(res, myClient);
    expect(res.data.accessToken).toBeFalsy();

    //wait 2500ms
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const profile2: UserProfile = await myClient.findOne({
      id: user.profileId,
      user: user.id,
    });
    expect(profile2.bio).toBe(user.bio);
  }, 15000);

  it('should detect CSRF mismatches', async () => {
    const user = users['CSRF Dude'];
    const myClient = getProfileClient();
    myClient.config.globalOptions = { jwtCookie: true };

    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password,
      expiresInSec: 10,
    };
    await myClient.login(dto, true);
    let error = null;
    try {
      await myClient.findOne({
        id: user.profileId,
        user: user.id,
      });
    } catch (e) {
      console.log(e.response.data);
      error = e.response.status;
    }
    expect(error).toBe(403);

    //wait 600ms
    await new Promise((resolve) => setTimeout(resolve, 600));
    const raw = await myClient.login(dto, true);
    extractAndSetCRSF(raw, myClient);

    const profile: UserProfile = await myClient.findOne({
      id: user.profileId,
      user: user.id,
    });
    expect(profile.bio).toBe(user.bio);

    //wait 4000ms
    await new Promise((resolve) => setTimeout(resolve, 4000));

    const res = await myClient.userServiceCmd('check_jwt', {}, true);
    const match = parseJwtCookieFromRes(res);
    expect(match).toBeTruthy();
    myClient.setJwt(match[1]);

    error = null;
    try {
      await myClient.findOne({
        id: user.profileId,
        user: user.id,
      });
    } catch (e) {
      console.log(e.response.data);
      error = e.response.status;
    }
    expect(error).toBe(403);

    myClient.setJwt(match[1]);
    extractAndSetCRSF(res, myClient);

    const profile2: UserProfile = await myClient.findOne({
      id: user.profileId,
      user: user.id,
    });
    expect(profile2.bio).toBe(user.bio);
  }, 10000);

  it(
    '401 should unset jwt cookie',
    async () => {
      const myClient = getProfileClient();
      myClient.config.globalOptions = { jwtCookie: true };

      myClient.setJwt('badjwt');

      const res = await myClient.userServiceCmd('check_jwt', {}, true, false);
      const matchLogout = parseJwtCookieFromRes(
        res.response,
        /eicrud-jwt=; Max-Age=([^;]*);/,
      );
      expect(matchLogout).toBeTruthy();
      expect(matchLogout[1]).toBe('0');
    },
    6000 * 100,
  );
});
