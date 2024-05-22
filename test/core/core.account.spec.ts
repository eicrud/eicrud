import { Test, TestingModule } from '@nestjs/testing';

import { getModule, createNestApplication, readyApp, dropDatabases } from '../test.module';
import { CrudController } from '../../core/crud/crud.controller';
import { MyUserService } from '../myuser.service';
import { CrudAuthService } from '../../core/authentification/auth.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager } from '@mikro-orm/mongodb';
import { UserProfile } from '../entities/UserProfile';
import { CrudQuery } from '../../shared/CrudQuery';
import { createAccountsAndProfiles, createNewProfileTest, testMethod } from '../test.utils';
import { MyProfileService } from '../profile.service';
import { CRUD_CONFIG_KEY, CrudConfigService } from '../../core/crud/crud.config.service';
import { TestUser } from '../test.utils';
import { CreateAccountDto } from '../../core/user/crud-user.service';
import { MyUser } from '../entities/MyUser';
import exp from 'constants';
import { LoginDto, LoginResponseDto } from '../../shared/dtos';

const testAdminCreds = {
  email: "admin@testmail.com",
  password: "testpassword"
}

describe('AppController', () => {
  let appController: CrudController;
  let userService: MyUserService;
  let authService: CrudAuthService;
  let profileService: MyProfileService;
  let app: NestFastifyApplication;
  let profiles: Record<string,UserProfile> = {};

  let usersWithoutProfiles: string[] = [];

  let entityManager: EntityManager;

  let crudConfig: CrudConfigService;

  const users: Record<string, TestUser> = {
    "Michael Doe" : {
        email: "michael.doe@test.com",
        role: "super_admin",
        bio: 'BIO_FIND_KEY',
        store: profiles,
    },
    "RateLimit Gus" : {
      email: "RateLimit.Gus@test.com",
      role: "super_admin",
      bio: 'My bio.',
      store: profiles,
    },    
    "RateLimit Joe" : {
      email: "RateLimit.Joe@test.com",
      role: "super_admin",
      bio: 'My bio.',
      store: profiles,
    },
    "Sarah Doe" :{
        email: "sarah.doe@test.com",
        role: "super_admin",
        bio: 'BIO_FIND_KEY',
        store: profiles,
        skipProfile: true,
    },
    "John Red": {
      email: "John.red@test.com",
      role: "super_admin",
      bio: 'My bio.',
      store: profiles,
      favoriteColor: "red",
    }
   
}


  beforeAll(async () => {

    const moduleRef: TestingModule = await Test.createTestingModule(
      getModule(require('path').basename(__filename))
    ).compile();
    await dropDatabases(moduleRef);

    app = createNestApplication(moduleRef)

    await app.init();
    await readyApp(app);

    crudConfig = moduleRef.get<CrudConfigService>(CRUD_CONFIG_KEY,{ strict: false });
    appController = app.get<CrudController>(CrudController);
    userService = app.get<MyUserService>(MyUserService);
    authService = app.get<CrudAuthService>(CrudAuthService);
    profileService = app.get<MyProfileService>(MyProfileService);
    entityManager = app.get<EntityManager>(EntityManager);

  
    await createAccountsAndProfiles(users, userService, crudConfig, { usersWithoutProfiles, testAdminCreds });
    
  }, 10000);

  //@Post('/crud/one')
  it('should authorize createAccount for guest and provide working accessToken', async () => {
    const user = users["Sarah Doe"];
    const payload: CreateAccountDto = {
      email: "newguy@mail.com",
      password: "p4ssw0rd",
    };
    const query: CrudQuery = {
      service: 'my-user',
      cmd: 'createAccount',
    }
    let jwt = null;

    const { userId, accessToken } = await testMethod({ url: '/crud/cmd', method: 'POST', expectedCode: 201, app, jwt, entityManager, payload, query, crudConfig});

    const userDb: MyUser =  await userService.$findOne({ id: userService.dbAdapter.createNewId(userId) }, null);
    
    expect(userDb.email).toEqual(payload.email);

    jwt = accessToken;
    const res = await testMethod({ url: '/crud/auth', method: 'GET', expectedCode: 200, app, jwt, entityManager, payload, query, crudConfig});

    expect(res.userId).toEqual(userId);

  });  

  it('should forbid createAccount when not called in secure mode', async () => {
    const payload: CreateAccountDto = {
      email: "newguy@mail.com",
      password: "p4ssw0rd",
    };
    const query: CrudQuery = {
      service: 'my-user',
      cmd: 'createAccount',
    }
    let jwt = null;

    await testMethod({ url: '/crud/cmd', method: 'PATCH', expectedCode: 403, app, jwt, entityManager, payload, query, crudConfig});

  }); 
  
  it('shoud login user when correct password is provided', async () => {
      const user = users["Michael Doe"];
      const payload: LoginDto = {
        email: user.email,
        password: testAdminCreds.password,
      }
      const query = { };

      let jwt = null;

      const res: LoginResponseDto = await testMethod({ url: '/crud/auth', method: 'POST', expectedCode: 201, app, jwt, entityManager, payload, query, crudConfig});

      expect(res.userId.toString()).toEqual(user.id.toString());
      jwt = res.accessToken;
      const res2: LoginResponseDto = await testMethod({ url: '/crud/auth', method: 'GET', expectedCode: 200, app, jwt, entityManager, payload, query, crudConfig});
      expect(res2.userId.toString()).toEqual(user.id.toString());

  });

  it('shoud fail login user when incorrect password is provided', async () => {
      const user = users["Michael Doe"];
      const payload: LoginDto = {
        email: user.email,
        password: "badpassword",
      }
      const query = { };

      let jwt = null;

     await testMethod({ url: '/crud/auth', method: 'POST', expectedCode: 401, app, jwt, entityManager, payload, query, crudConfig});

  });

  it('should rate limit login attempts (too many)', async () => {
    const user = users["RateLimit Gus"];
    const payload: LoginDto = {
      email: user.email,
      password: "badpassword",
    }
    const query = { };

    let jwt = null;

    for(let i = 0; i < 6; i++){
      await testMethod({ url: '/crud/auth', method: 'POST', expectedCode: 401, app, jwt, entityManager, payload, query, crudConfig});
      await new Promise((r) => setTimeout(r, 600));
    }
    payload.password = testAdminCreds.password;
    await testMethod({ url: '/crud/auth', method: 'POST', expectedCode: 429, app, jwt, entityManager, payload, query, crudConfig});

  }, 15000);


  it('should rate limit login attempts (too fast)', async () => {
    const user = users["RateLimit Joe"];
    const payload: LoginDto = {
      email: user.email,
      password: "badpassword",
    }
    const query = { };

    let jwt = null;

    testMethod({ url: '/crud/auth', method: 'POST', expectedCode: 401, app, jwt, entityManager, payload, query, crudConfig});
    await testMethod({ url: '/crud/auth', method: 'POST', expectedCode: 425, app, jwt, entityManager, payload, query, crudConfig});
      

  }, 5000);
  
  it('should trim and lowercase email on login', async () => {
    const user = users["Michael Doe"];
    const payload: LoginDto = {
      email: user.email.toUpperCase() + "  ",
      password: testAdminCreds.password,
    }
    const query = { };

    let jwt = null;

    const res: LoginResponseDto = await testMethod({ url: '/crud/auth', method: 'POST', expectedCode: 201, app, jwt, entityManager, payload, query, crudConfig});

    expect(res.userId.toString()).toEqual(user.id.toString());
    jwt = res.accessToken;
    const res2: LoginResponseDto = await testMethod({ url: '/crud/auth', method: 'GET', expectedCode: 200, app, jwt, entityManager, payload, query, crudConfig});
    expect(res2.userId.toString()).toEqual(user.id.toString());

  });

  it('should trim and lowercase email on createAccount', async () => {
    const payload: CreateAccountDto = {
      email: " nonTriMMed@mail.com ",
      password: testAdminCreds.password,
    };
    const query: CrudQuery = {
      service: 'my-user',
      cmd: 'createAccount',
    }
    let jwt = null;

    const { userId, accessToken } = await testMethod({ url: '/crud/cmd', method: 'POST', expectedCode: 201, app, jwt, entityManager, payload, query, crudConfig});

    const userDb: MyUser =  await userService.$findOne({ id: userService.dbAdapter.createNewId(userId) }, null);

    expect(userDb.email).toEqual(payload.email.trim().toLowerCase());

  });




});