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
import { MyUser } from '../src/services/my-user/my-user.entity';
import exp from 'constants';
import { CrudQuery } from '@eicrud/core/crud/model/CrudQuery';
import { LoginDto } from '@eicrud/core/config/basecmd_dtos/user/login.dto';
import {
  FindResponseDto,
  IChangePasswordDto,
  ICreateAccountDto,
  IResetPasswordDto,
  ISendPasswordResetEmailDto,
  ISendVerificationEmailDto,
  ITimeoutUserDto,
  IUserIdDto,
  IVerifyTokenDto,
  LoginResponseDto,
} from '@eicrud/shared/interfaces';
import { FakeEmail } from '../src/services/fake-email/fake-email.entity';
import { FakeEmailService as MyEmailService } from '../src/services/fake-email/fake-email.service';
import { CrudUser } from '@eicrud/core/config';
import { CrudErrors } from '@eicrud/shared/CrudErrors';
import { timeout } from "../env";

const testAdminCreds = {
  email: 'admin@testmail.com',
  password: 'testpassword',
};

describe('AppController', () => {
  let appController: CrudController;
  let userService: MyUserService;
  let authService: CrudAuthService;
  let emailService: MyEmailService;
  let profileService: MyProfileService;
  let app: NestFastifyApplication;
  let profiles: Record<string, UserProfile> = {};

  let usersWithoutProfiles: string[] = [];

  let entityManager: EntityManager;

  let crudConfig: CrudConfigService;

  const users: Record<string, TestUser> = {
    '2Fa Dude': {
      email: '2Fa.Dude@test.com',
      role: 'super_admin',
      bio: 'BIO_FIND_KEY',
      store: profiles,
      username: '2fadude60',
    },
    'Michael Doe': {
      email: 'michael.doe@test.com',
      role: 'super_admin',
      bio: 'BIO_FIND_KEY',
      store: profiles,
      username: 'michaeldoe61',
    },
    'Michael Joe': {
      email: 'michael.joe@test.com',
      role: 'user',
      bio: 'BIO_FIND_KEY',
      store: profiles,
      username: 'michaeljoe61',
    },
    'Michael Foe': {
      email: 'michael.foe@test.com',
      role: 'user',
      bio: 'BIO_FIND_KEY',
      store: profiles,
      username: 'michaelfoe61',
    },
    'RateLimit Gus': {
      email: 'RateLimit.Gus@test.com',
      role: 'super_admin',
      bio: 'My bio.',
      store: profiles,
      username: 'ratelimitgus',
    },
    'RateLimit Joe': {
      email: 'RateLimit.Joe@test.com',
      role: 'super_admin',
      bio: 'My bio.',
      store: profiles,
      username: 'ratelimitjoe',
    },
    'Sarah Doe': {
      email: 'sarah.doe@test.com',
      role: 'super_admin',
      bio: 'BIO_FIND_KEY',
      store: profiles,
      skipProfile: true,
      username: 'sarahdoe62',
    },
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule(
      getModule(require('path').basename(__filename)),
    ).compile();
    await dropDatabases(moduleRef);

    app = createNestApplication(moduleRef);

    crudConfig = moduleRef.get<CrudConfigService>(CRUD_CONFIG_KEY, {
      strict: false,
    });

    crudConfig.authenticationOptions.username_field = 'username';

    await app.init();
    await readyApp(app);

    appController = app.get<CrudController>(CrudController);
    userService = app.get<MyUserService>(MyUserService);
    authService = app.get<CrudAuthService>(CrudAuthService);
    emailService = app.get<MyEmailService>(MyEmailService);
    profileService = app.get<MyProfileService>(MyProfileService);
    entityManager = app.get<EntityManager>(EntityManager);

    await createAccountsAndProfiles(users, userService, crudConfig, {
      usersWithoutProfiles,
      testAdminCreds,
    });
  }, timeout*2);

  //@Post('/crud/one')
  it('should authorize createAccount for guest and provide working accessToken', async () => {
    const user = users['Sarah Doe'];
    const payload: ICreateAccountDto = {
      email: 'newmail@mail2.com',
      password: 'p4ssw0rd',
      username: user.username,
      role: 'user',
      logMeIn: true,
    };
    const query: CrudQuery = {
      service: 'my-user',
      cmd: 'create_account',
    };
    let jwt = null;

    await testMethod({
      url: '/crud/cmd',
      method: 'POST',
      expectedCode: 400,
      expectedCrudCode: CrudErrors.EMAIL_ALREADY_TAKEN.code,
      app,
      jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });

    payload.username = 'newguy63';
    payload.email = 'newguy63@mail.com';

    const { userId, accessToken } = await testMethod({
      url: '/crud/cmd',
      method: 'POST',
      expectedCode: 201,
      app,
      jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });

    const userDb: MyUser = await userService.$findOne(
      { id: userService.dbAdapter.createNewId(userId) },
      null,
    );

    expect(userDb.username).toEqual(payload.username);
    delete query.cmd;
    jwt = accessToken;
    const res = await testMethod({
      url: '/crud/auth',
      method: 'GET',
      expectedCode: 200,
      app,
      jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });

    expect(res.userId).toEqual(userId);
  });

  it('shoud login user when correct password is provided', async () => {
    const user = users['Michael Doe'];
    const payload: LoginDto = {
      email: user.username,
      password: testAdminCreds.password,
    };
    const query = {};

    let jwt = null;

    const res: LoginResponseDto = await testMethod({
      url: '/crud/auth',
      method: 'POST',
      expectedCode: 201,
      app,
      jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });

    expect(res.userId.toString()).toEqual(user.id.toString());
    jwt = res.accessToken;
    const res2: LoginResponseDto = await testMethod({
      url: '/crud/auth',
      method: 'GET',
      expectedCode: 200,
      app,
      jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });
    expect(res2.userId.toString()).toEqual(user.id.toString());
  });

  it('shoud fail login user when incorrect password is provided', async () => {
    const user = users['Michael Doe'];
    const payload: LoginDto = {
      email: user.username,
      password: 'badpassword',
    };
    const query = {};

    let jwt = null;

    await testMethod({
      url: '/crud/auth',
      method: 'POST',
      expectedCode: 401,
      app,
      jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });
  });

  it('should rate limit login attempts (too many)', async () => {
    const user = users['RateLimit Gus'];
    user.username = user.username.toLocaleLowerCase();
    user.email = user.email.toLocaleLowerCase();
    const payload: LoginDto = {
      email: user.username,
      password: 'badpassword',
    };
    const query = {};

    let jwt = null;

    for (let i = 0; i < 6; i++) {
      await testMethod({
        url: '/crud/auth',
        method: 'POST',
        expectedCode: 401,
        app,
        jwt,
        entityManager,
        payload,
        query,
        crudConfig,
      });
      await new Promise((r) => setTimeout(r, 600));
    }
    payload.password = testAdminCreds.password;
    await testMethod({
      url: '/crud/auth',
      method: 'POST',
      expectedCode: 429,
      app,
      jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });

    // password reset should allow login even if rate limited
    const resetPassEmailDto: ISendPasswordResetEmailDto = {
      email: user.email,
    };

    const resetPassQuery: CrudQuery = {
      service: 'my-user',
      cmd: 'send_password_reset_email',
    };
    await testMethod({
      url: '/crud/cmd',
      method: 'POST',
      expectedCode: 201,
      app,
      jwt,
      entityManager,
      payload: resetPassEmailDto,
      query: resetPassQuery,
      crudConfig,
    });

    const email: FakeEmail = await emailService.$findOne(
      { to: user.email, type: 'passwordReset' },
      null,
    );
    expect(email).toBeTruthy();
    const resetPassDto: IResetPasswordDto = {
      token_id: email.message,
      newPassword: 'newpassword',
      logMeIn: true,
    };
    resetPassQuery.cmd = 'reset_password';
    const res = await testMethod({
      url: '/crud/cmd',
      method: 'POST',
      expectedCode: 201,
      app,
      jwt,
      entityManager,
      payload: resetPassDto,
      query: resetPassQuery,
      crudConfig,
    });

    await new Promise((r) => setTimeout(r, 600));

    payload.password = 'newpassword';
    await testMethod({
      url: '/crud/auth',
      method: 'POST',
      expectedCode: 429,
      app,
      jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });

    jwt = res.accessToken;

    const res2 = await testMethod({
      url: '/crud/auth',
      method: 'GET',
      expectedCode: 200,
      app,
      jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });
    expect(res2.userId).toEqual(user.id?.toString());

    // check that initial JWT has ben unvalidated
    await testMethod({
      url: '/crud/auth',
      method: 'GET',
      expectedCode: 401,
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      expectedCrudCode: CrudErrors.TOKEN_MISMATCH.code,
      query,
      crudConfig,
    });
  }, timeout*3);

  it('should rate limit login attempts (too fast)', async () => {
    const user = users['RateLimit Joe'];
    const payload: LoginDto = {
      email: user.username,
      password: 'badpassword',
    };
    const query = {};

    let jwt = null;

    testMethod({
      url: '/crud/auth',
      method: 'POST',
      expectedCode: 401,
      app,
      jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });
    await testMethod({
      url: '/crud/auth',
      method: 'POST',
      expectedCode: 425,
      app,
      jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });
  });

  it('should trim and lowercase username on login', async () => {
    const user = users['Michael Doe'];
    const payload: LoginDto = {
      email: user.username.toUpperCase() + '  ',
      password: testAdminCreds.password,
    };
    const query = {};

    let jwt = null;

    const res: LoginResponseDto = await testMethod({
      url: '/crud/auth',
      method: 'POST',
      expectedCode: 201,
      app,
      jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });

    expect(res.userId.toString()).toEqual(user.id.toString());
    jwt = res.accessToken;
    const res2: LoginResponseDto = await testMethod({
      url: '/crud/auth',
      method: 'GET',
      expectedCode: 200,
      app,
      jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });
    expect(res2.userId.toString()).toEqual(user.id.toString());
  });

  it('should trim and lowercase username on create_account', async () => {
    const payload: ICreateAccountDto = {
      email: ' nonTriMMed@mail.com ',
      username: ' nonTriMMedUsername ',
      password: testAdminCreds.password,
      role: 'user',
      logMeIn: true,
    };
    const query: CrudQuery = {
      service: 'my-user',
      cmd: 'create_account',
    };
    let jwt = null;

    const { userId, accessToken } = await testMethod({
      url: '/crud/cmd',
      method: 'POST',
      expectedCode: 201,
      app,
      jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });

    const userDb: MyUser = await userService.$findOne(
      { id: userService.dbAdapter.createNewId(userId) },
      null,
    );

    expect(userDb.username).toEqual(payload.username.trim().toLowerCase());
  });

  it('should log with 2fa', async () => {
    const user = users['2Fa Dude'];

    const patch: Partial<MyUser> = {
      twoFA: true,
    };
    await userService.$patchOne(
      { id: crudConfig.dbAdapter.formatId(user.id, crudConfig) } as any,
      patch as any,
      null,
    );

    const query = {};

    let jwt = null;

    // 2 times for loop
    for (let i = 0; i < 2; i++) {
      const payload: LoginDto = {
        email: user.username,
        password: testAdminCreds.password,
      };

      await testMethod({
        url: '/crud/auth',
        method: 'POST',
        expectedCode: 401,
        expectedCrudCode: CrudErrors.TWOFA_REQUIRED.code,
        app,
        jwt,
        entityManager,
        payload,
        query,
        crudConfig,
      });

      const res = await emailService.$find(
        { to: user.email.toLowerCase().trim(), type: 'twoFactor' },
        null,
      );

      const email: FakeEmail = res.data[res.data.length - 1];

      expect(email).toBeTruthy();

      payload.twoFA_code = email.message;

      // wait 600ms
      await new Promise((r) => setTimeout(r, 600));

      await testMethod({
        url: '/crud/auth',
        method: 'POST',
        expectedCode: 201,
        app,
        jwt,
        entityManager,
        payload,
        query,
        crudConfig,
      });

      // wait 600ms
      await new Promise((r) => setTimeout(r, 600));

      await testMethod({
        url: '/crud/auth',
        method: 'POST',
        expectedCode: 401,
        expectedCrudCode: CrudErrors.INVALID_CREDENTIALS.code,
        app,
        jwt,
        entityManager,
        payload,
        query,
        crudConfig,
      });

      // wait 600ms
      await new Promise((r) => setTimeout(r, 600));
    }

    if (process.env.CRUD_CURRENT_MS) {
      // changing crudConfig doesn't work in ms configuration
      return;
    }

    const oldValue = crudConfig.authenticationOptions.twoFaEmailTimeoutMinutes;
    crudConfig.authenticationOptions.twoFaEmailTimeoutMinutes = 0;

    const payload: LoginDto = {
      email: user.username,
      password: testAdminCreds.password,
    };

    await testMethod({
      url: '/crud/auth',
      method: 'POST',
      expectedCode: 401,
      expectedCrudCode: CrudErrors.TWOFA_REQUIRED.code,
      app,
      jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });

    const res = await emailService.$find(
      { to: user.email.toLowerCase().trim(), type: 'twoFactor' },
      null,
    );
    const email: FakeEmail = res.data[res.data.length - 1];
    payload.twoFA_code = email.message;

    // wait 600ms
    await new Promise((r) => setTimeout(r, 600));

    await testMethod({
      url: '/crud/auth',
      method: 'POST',
      expectedCode: 401,
      expectedCrudCode: CrudErrors.TOKEN_EXPIRED.code,
      app,
      jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });

    crudConfig.authenticationOptions.twoFaEmailTimeoutMinutes = oldValue;
  }, timeout*2);

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
        username: users['Michael Joe'].username,
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
      basicAuth: {
        username: user.username,
        password: testAdminCreds.password,
      },
      entityManager,
      payload,
      query,
      expectedCode: 200,
      expectedObject,
      crudConfig,
    });
  }, timeout*2);
});
