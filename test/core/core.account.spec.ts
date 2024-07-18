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
import { EntityManager } from '@mikro-orm/mongodb';
import { UserProfile } from '../src/services/userprofile/userprofile.entity';
import {
  createAccountsAndProfiles,
  createNewProfileTest,
  testMethod,
} from '../test.utils';
import { UserProfileService as MyProfileService } from '../src/services/userprofile/userprofile.service';
import {
  CRUD_CONFIG_KEY,
  CrudConfigService,
} from '../../core/config/crud.config.service';
import { TestUser } from '../test.utils';
import { MyUser } from '../src/services/myuser/myuser.entity';
import exp from 'constants';
import { CrudQuery } from '../../core/crud/model/CrudQuery';
import { LoginDto } from '../../core/crud/model/dtos';
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
} from '../../shared/interfaces';
import { FakeEmail } from '../src/services/fakeemail/fakeemail.entity';
import { FakeEmailService as MyEmailService } from '../src/services/fakeemail/fakeemail.service';
import { CrudUser } from '@eicrud/core/config';
import { CrudErrors } from '../../shared/CrudErrors';

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
    },
    'Michael Doe': {
      email: 'michael.doe@test.com',
      role: 'super_admin',
      bio: 'BIO_FIND_KEY',
      store: profiles,
    },
    'RateLimit Gus': {
      email: 'RateLimit.Gus@test.com',
      role: 'super_admin',
      bio: 'My bio.',
      store: profiles,
    },
    'PassReset Gus': {
      email: 'PassReset.Gus@test.com',
      role: 'super_admin',
      bio: 'My bio.',
      store: profiles,
    },
    'PassChange Gus': {
      email: 'PassChange.Gus@test.com',
      role: 'super_admin',
      bio: 'My bio.',
      store: profiles,
    },
    'RateLimit Joe': {
      email: 'RateLimit.Joe@test.com',
      role: 'super_admin',
      bio: 'My bio.',
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
    'Noverif Email': {
      email: 'Noverif.Email@test.com',
      role: 'user',
      bio: 'My bio.',
    },
    'Manyverif Email': {
      email: 'Manyverif.Email@test.com',
      role: 'user',
      bio: 'My bio.',
    },
    'Changemy Email': {
      email: 'Changemy.Email@test.com',
      role: 'user',
      bio: 'My bio.',
    },
    'FailChangemy Email': {
      email: 'FailChangemy.Email@test.com',
      role: 'user',
      bio: 'My bio.',
    },
    'Logme Out': {
      email: 'Logme.Out@test.com',
      role: 'user',
      bio: 'My bio.',
    },
    'Moderator Joe': {
      email: 'Moderator.Joe@test.com',
      role: 'moderator',
      bio: 'My bio.',
    },
    'Time Meout': {
      email: 'Time.Meout@test.com',
      role: 'user',
      bio: 'My bio.',
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
    emailService = app.get<MyEmailService>(MyEmailService);
    profileService = app.get<MyProfileService>(MyProfileService);
    entityManager = app.get<EntityManager>(EntityManager);

    await createAccountsAndProfiles(users, userService, crudConfig, {
      usersWithoutProfiles,
      testAdminCreds,
    });
  }, 10000);

  //@Post('/crud/one')
  it('should authorize createAccount for guest and provide working accessToken', async () => {
    const user = users['Sarah Doe'];
    const payload: ICreateAccountDto = {
      email: user.email,
      password: 'p4ssw0rd',
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

    payload.email = 'newguy@mail.com';

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

    expect(userDb.email).toEqual(payload.email);
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

  it('should forbid send_verification_email when not called in secure mode', async () => {
    const payload = {};
    const query: CrudQuery = {
      service: 'my-user',
      cmd: 'send_verification_email',
    };
    let jwt = null;

    await testMethod({
      url: '/crud/cmd',
      method: 'PATCH',
      expectedCode: 403,
      app,
      jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });
  });

  it('shoud login user when correct password is provided', async () => {
    const user = users['Michael Doe'];
    const payload: LoginDto = {
      email: user.email,
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
      email: user.email,
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
    user.email = user.email.toLocaleLowerCase();
    const payload: LoginDto = {
      email: user.email,
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
  }, 17000);

  it('should reset password', async () => {
    const user = users['PassReset Gus'];
    user.email = user.email.toLocaleLowerCase();
    const payload: LoginDto = {
      email: user.email,
      password: testAdminCreds.password,
    };
    const query = {};

    let jwt = null;

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

    //check old password is still working
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
    await new Promise((r) => setTimeout(r, 600));

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

    payload.password = 'newpassword';

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
  }, 7000);

  it('should change password', async () => {
    const user = users['PassChange Gus'];
    user.email = user.email.toLocaleLowerCase();
    const payload: LoginDto = {
      email: user.email,
      password: testAdminCreds.password,
    };
    const query = {};

    let jwt = null;

    //check old password is still working
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
    await new Promise((r) => setTimeout(r, 600));

    const resetPassDto: IChangePasswordDto = {
      oldPassword: testAdminCreds.password,
      newPassword: 'newpassword2',
      logMeIn: true,
    };
    const changePassQuery: CrudQuery = {
      service: 'my-user',
      cmd: 'change_password',
    };
    jwt = user.jwt;
    await testMethod({
      url: '/crud/cmd',
      method: 'POST',
      expectedCode: 201,
      app,
      jwt,
      entityManager,
      payload: resetPassDto,
      query: changePassQuery,
      crudConfig,
    });

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

    payload.password = 'newpassword2';

    await testMethod({
      url: '/crud/auth',
      method: 'POST',
      expectedCode: 201,
      app,
      jwt: null,
      entityManager,
      payload,
      query,
      crudConfig,
    });

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
  }, 7000);

  it('should rate limit login attempts (too fast)', async () => {
    const user = users['RateLimit Joe'];
    const payload: LoginDto = {
      email: user.email,
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

  it('should trim and lowercase email on login', async () => {
    const user = users['Michael Doe'];
    const payload: LoginDto = {
      email: user.email.toUpperCase() + '  ',
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

  it('should trim and lowercase email on create_account', async () => {
    const payload: ICreateAccountDto = {
      email: ' nonTriMMed@mail.com ',
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

    expect(userDb.email).toEqual(payload.email.trim().toLowerCase());
  });

  it('should verify user email', async () => {
    const user = users['Noverif Email'];
    user.email = user.email.toLocaleLowerCase();
    const payload: LoginDto = {
      email: user.email,
      password: testAdminCreds.password,
    };
    const query = {};

    let jwt = null;

    const res0: LoginResponseDto = await testMethod({
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

    jwt = res0.accessToken;

    const resetPassEmailDto: ISendVerificationEmailDto = {};

    const resetPassQuery: CrudQuery = {
      service: 'my-user',
      cmd: 'send_verification_email',
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

    //check email not verified yet
    const currentUser: CrudUser = await userService.$findOne(
      { id: user.id },
      null,
    );
    expect(currentUser.verifiedEmail).toBeFalsy();

    const email: FakeEmail = await emailService.$findOne(
      { to: user.email, type: 'emailVerification' },
      null,
    );
    expect(email).toBeTruthy();
    const resetPassDto: IVerifyTokenDto = {
      token_id: email.message,
      logMeIn: true,
    };
    resetPassQuery.cmd = 'verify_email';
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

    const currentUser2: CrudUser = await userService.$findOne(
      { id: user.id },
      null,
    );
    expect(currentUser2.verifiedEmail).toBeTruthy();
  }, 7000);

  it('should timeout to many email sent', async () => {
    const user = users['Manyverif Email'];
    user.email = user.email.toLocaleLowerCase();
    const payload: LoginDto = {
      email: user.email,
      password: testAdminCreds.password,
    };
    const query = {};

    if (process.env.CRUD_CURRENT_MS) {
      // changing crudConfig doesn't work in ms configuration
      return;
    }
    crudConfig.authenticationOptions.verificationEmailTimeoutHours =
      1 / 60 / 6 / 2;

    let jwt = null;

    const res0: LoginResponseDto = await testMethod({
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

    jwt = res0.accessToken;

    const resetPassEmailDto: ISendVerificationEmailDto = {};

    const sendEmail = async (expectedCode = 201) => {
      const resetPassQuery: CrudQuery = {
        service: 'my-user',
        cmd: 'send_verification_email',
      };
      await testMethod({
        url: '/crud/cmd',
        method: 'POST',
        expectedCode: expectedCode,
        app,
        jwt,
        entityManager,
        payload: resetPassEmailDto,
        query: resetPassQuery,
        crudConfig,
      });
    };

    await sendEmail();

    const fetchEmails = async () => {
      const res: FindResponseDto<FakeEmail> = await emailService.$find(
        { to: user.email, type: 'emailVerification' },
        null,
      );
      return res;
    };
    expect((await fetchEmails()).data.length).toBe(1);

    await sendEmail();

    expect((await fetchEmails()).data.length).toBe(2);

    await sendEmail(400);

    expect((await fetchEmails()).data.length).toBe(2);

    //Wait 5sec
    await new Promise((r) => setTimeout(r, 5000));

    await sendEmail();
    expect((await fetchEmails()).data.length).toBe(3);
  }, 7000);

  it('should change user email', async () => {
    const user = users['Changemy Email'];
    user.email = user.email.toLocaleLowerCase();
    const payload: LoginDto = {
      email: user.email,
      password: testAdminCreds.password,
    };
    const query = {};

    let jwt = null;

    const res0: LoginResponseDto = await testMethod({
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

    jwt = res0.accessToken;
    const originalJwT = jwt;

    // password reset should allow login even if rate limited
    const resetPassEmailDto: ISendVerificationEmailDto = {
      password: testAdminCreds.password,
      newEmail: 'changed@email.com',
    };

    const resetPassQuery: CrudQuery = {
      service: 'my-user',
      cmd: 'send_verification_email',
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

    //check email not verified yet
    const currentUser: CrudUser = await userService.$findOne(
      { id: user.id },
      null,
    );
    expect(currentUser.verifiedEmail).toBeFalsy();
    expect(currentUser.email).toBe(user.email);

    const email: FakeEmail = await emailService.$findOne(
      { to: 'changed@email.com', type: 'emailVerification' },
      null,
    );
    expect(email).toBeTruthy();
    const resetPassDto: IVerifyTokenDto = {
      token_id: email.message,
      logMeIn: true,
    };
    resetPassQuery.cmd = 'verify_email';
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

    const currentUser2: CrudUser = await userService.$findOne(
      { id: user.id },
      null,
    );
    expect(currentUser2.verifiedEmail).toBeTruthy();
    expect(currentUser2.email).toBe('changed@email.com');

    // check returned token is valid
    const resCheck = await testMethod({
      url: '/crud/auth',
      method: 'GET',
      expectedCode: 200,
      app,
      jwt: res.accessToken,
      entityManager,
      payload,
      query,
      crudConfig,
    });
    expect(resCheck.userId).toEqual(user.id?.toString());

    // check that initial JWT has ben unvalidated
    await testMethod({
      url: '/crud/auth',
      method: 'GET',
      expectedCode: 401,
      app,
      jwt: originalJwT,
      entityManager,
      payload,
      expectedCrudCode: CrudErrors.TOKEN_MISMATCH.code,
      query,
      crudConfig,
    });
  });

  it('should fail to change email to existing', async () => {
    const user = users['FailChangemy Email'];
    user.email = user.email.toLocaleLowerCase();
    const payload: LoginDto = {
      email: user.email,
      password: testAdminCreds.password,
    };
    const query = {};

    let jwt = null;

    const res0: LoginResponseDto = await testMethod({
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

    jwt = res0.accessToken;

    // password reset should allow login even if rate limited
    const resetPassEmailDto: ISendVerificationEmailDto = {
      password: testAdminCreds.password,
      newEmail: users['Michael Doe'].email,
    };

    const resetPassQuery: CrudQuery = {
      service: 'my-user',
      cmd: 'send_verification_email',
    };
    await testMethod({
      url: '/crud/cmd',
      method: 'POST',
      expectedCode: 400,
      expectedCrudCode: CrudErrors.EMAIL_ALREADY_TAKEN.code,
      app,
      jwt,
      entityManager,
      payload: resetPassEmailDto,
      query: resetPassQuery,
      crudConfig,
    });
  });

  it('should logout_everywhere', async () => {
    const user = users['Logme Out'];
    user.email = user.email.toLocaleLowerCase();
    const payload: LoginDto = {
      email: user.email,
      password: testAdminCreds.password,
    };
    const query = {};

    let jwt = null;

    const res0: LoginResponseDto = await testMethod({
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

    jwt = res0.accessToken;

    // password reset should allow login even if rate limited
    const resetPassEmailDto: IUserIdDto = {
      userId: user.id,
    };

    const resetPassQuery: CrudQuery = {
      service: 'my-user',
      cmd: 'logout_everywhere',
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

    resetPassQuery.cmd = 'verify_email';
    await testMethod({
      url: '/crud/cmd',
      method: 'POST',
      expectedCode: 401,
      app,
      jwt,
      entityManager,
      payload: {},
      query: resetPassQuery,
      crudConfig,
    });
  });

  it('should timeout_user', async () => {
    const userToTimeOut = users['Time Meout'];
    userToTimeOut.email = userToTimeOut.email.toLocaleLowerCase();
    const loginPayload: LoginDto = {
      email: userToTimeOut.email,
      password: testAdminCreds.password,
    };
    const query = {};

    let jwt = null;

    await testMethod({
      url: '/crud/auth',
      method: 'POST',
      expectedCode: 201,
      app,
      jwt,
      entityManager,
      payload: loginPayload,
      query,
      crudConfig,
    });

    const moderator = users['Moderator Joe'];
    moderator.email = moderator.email.toLocaleLowerCase();
    loginPayload.email = moderator.email;

    const res0: LoginResponseDto = await testMethod({
      url: '/crud/auth',
      method: 'POST',
      expectedCode: 201,
      app,
      jwt,
      entityManager,
      payload: loginPayload,
      query,
      crudConfig,
    });

    jwt = res0.accessToken;

    const timeoutUserDto: ITimeoutUserDto = {
      userId: userToTimeOut.id,
      timeoutDurationMinutes: 10,
      allowedRoles: [],
    };

    const timeoutUserQuery: CrudQuery = {
      service: 'my-user',
      cmd: 'timeout_user',
    };
    await testMethod({
      url: '/crud/cmd',
      method: 'POST',
      expectedCode: 403,
      app,
      jwt,
      entityManager,
      payload: timeoutUserDto,
      query: timeoutUserQuery,
      crudConfig,
    });

    timeoutUserDto.allowedRoles = ['user'];
    await testMethod({
      url: '/crud/cmd',
      method: 'POST',
      expectedCode: 201,
      app,
      jwt,
      entityManager,
      payload: timeoutUserDto,
      query: timeoutUserQuery,
      crudConfig,
    });

    //wait 600ms
    await new Promise((r) => setTimeout(r, 600));

    loginPayload.email = userToTimeOut.email;
    await testMethod({
      url: '/crud/auth',
      method: 'POST',
      expectedCode: 401,
      expectedCrudCode: CrudErrors.TIMED_OUT.code,
      app,
      jwt: null,
      entityManager,
      payload: loginPayload,
      query,
      crudConfig,
    });

    timeoutUserDto.allowedRoles = ['super_admin', 'user'];
    timeoutUserDto.userId = users['Michael Doe'].id;
    await testMethod({
      url: '/crud/cmd',
      method: 'POST',
      expectedCode: 403,
      app,
      jwt,
      entityManager,
      payload: timeoutUserDto,
      query: timeoutUserQuery,
      crudConfig,
    });
  }, 6000);

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
        email: user.email,
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
      email: user.email,
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
  }, 8000);
});
