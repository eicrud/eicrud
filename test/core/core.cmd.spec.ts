import { Test, TestingModule } from '@nestjs/testing';

import { getModule, createNestApplication, readyApp, dropDatabases } from '../test.module';
import { CrudController } from '../../core/crud/crud.controller';
import { MyUserService } from '../myuser.service';
import { CrudAuthService } from '../../core/authentication/auth.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { UserProfile } from '../entities/UserProfile';
import { CrudQuery } from '../../core/crud/model/CrudQuery';
import { createAccountsAndProfiles, createMelons, createNewProfileTest, testMethod } from '../test.utils';
import { MyProfileService, TestCmdDto } from '../profile.service';
import { Melon } from '../entities/Melon';
import { CrudService } from '../../core/crud/crud.service';
import { TestUser } from '../test.utils';
import { CRUD_CONFIG_KEY, CrudConfigService } from '../../core/config/crud.config.service';
import { format } from 'path';
import exp from 'constants';


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

  let entityManager: EntityManager;

  let crudConfig: CrudConfigService;





  const users: Record<string, TestUser> = {

    "Michael Doe": {
      email: "michael.doe@test.com",
      role: "user",
      bio: 'I am a cool guy.',
    },    
    "Jon Doe": {
      email: "jon.doe@test.com",
      role: "user",
      bio: 'I am a cool guy.',
    },
    "Admin Dude": {
      email: "admin.dude@mail.com",
      role: "admin",
      bio: 'I am a sys admin.',
      profileType: "admin",
    },

  }

  beforeAll(async () => {

    const moduleRef: TestingModule = await Test.createTestingModule(
      getModule(require('path').basename(__filename))
    ).compile();
    await dropDatabases(moduleRef);

    app = createNestApplication(moduleRef)

    await app.init();
    await readyApp(app);

    appController = app.get<CrudController>(CrudController);
    userService = app.get<MyUserService>(MyUserService);
    authService = app.get<CrudAuthService>(CrudAuthService);
    profileService = app.get<MyProfileService>(MyProfileService);
    entityManager = app.get<EntityManager>(EntityManager);
    crudConfig = app.get<CrudConfigService>(CRUD_CONFIG_KEY, { strict: false });

    await createAccountsAndProfiles(users, userService, crudConfig, { testAdminCreds });

  });


  it('should only allow cmd with max uses in secure mode', async () => {
    const user = users["Jon Doe"];

    const payload: TestCmdDto = {
      returnMessage: "Hello World"
    }

    const query: CrudQuery = {
      service: "user-profile",
      cmd: "testCmd",
    }

    await testMethod({ url: '/crud/cmd', method: 'PATCH', expectedCode: 403, app, jwt: user.jwt, entityManager, payload, query, crudConfig});
    
    await testMethod({ url: '/crud/cmd', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

  });

  it('should perform cmd & transform dto' , async () => {
    const user = users["Jon Doe"];

    const payload: TestCmdDto = {
      returnMessage: "Hello World"
    }

    const query: CrudQuery = {
      service: "user-profile",
      cmd: "testCmd",
    }

    const res = await testMethod({ url: '/crud/cmd', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

    expect(res).toEqual(payload.returnMessage?.toUpperCase());

  });  
  
  
  it('should perform cmd who calls cmd from another service (other ms)' , async () => {
    const user = users["Jon Doe"];

    const payload: TestCmdDto = {
      returnMessage: "Hello World"
    }

    const query: CrudQuery = {
      service: "my-user",
      cmd: "callTestCmd",
    }

    const res = await testMethod({ url: '/crud/cmd', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

    expect(res).toEqual(payload.returnMessage);

  });

  it('should validate cmd dto', async () => {
    const user = users["Jon Doe"];

    const payload: TestCmdDto = {
      returnMessage: "Hello World111111111111111111111111111111"
    }

    const query: CrudQuery = {
      service: "user-profile",
      cmd: "testCmd",
    }

    await testMethod({ url: '/crud/cmd', method: 'POST', expectedCode: 400, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

  });

  it('should validate & transform nested cmd dto', async () => {

    const user = users["Jon Doe"];

    const payload: Partial<TestCmdDto> = {
      returnMessage: "Hello World",
      sub: {
        subfield: "HELLO WORLD"
      },
      unknownField: "I should be removed"
    } as any;

    const query: CrudQuery = {
      service: "user-profile",
      cmd: "testCmd",
    }

    await testMethod({ url: '/crud/cmd', method: 'POST', expectedCode: 400, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

    delete (payload as any).unknownField;

    const res = await testMethod({ url: '/crud/cmd', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

    expect(res).toEqual(payload.sub?.subfield?.toLowerCase());


    for (let i = 0; i < 100; i++) {
      payload.sub.subfield += "a";
    }
    
    await testMethod({ url: '/crud/cmd', method: 'POST', expectedCode: 400, app, jwt: user.jwt, entityManager, payload, query, crudConfig});


  });

  it('should apply security to cmd', async () => {
 
    const payload: TestCmdDto = {
      returnMessage: "Hello World"
    }

    const query: CrudQuery = {
      service: "user-profile",
      cmd: "testCmd",
    }

    await testMethod({ url: '/crud/cmd', method: 'POST', expectedCode: 403, app, jwt: null, entityManager, payload, query, crudConfig});

    payload.returnMessage = "I'm a guest!";

    await testMethod({ url: '/crud/cmd', method: 'POST', expectedCode: 201, app, jwt: null, entityManager, payload, query, crudConfig});
    
    payload.forbiddenField = "POOP";

    await testMethod({ url: '/crud/cmd', method: 'POST', expectedCode: 403, app, jwt: null, entityManager, payload, query, crudConfig});

  });


  it('should inherit cmd rights', async () => {
    const user = users["Admin Dude"];

    const payload: TestCmdDto = {
      returnMessage: "Hello World"
    }

    const query: CrudQuery = {
      service: "user-profile",
      cmd: "testCmd",
    }

    await testMethod({ url: '/crud/cmd', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

  });
  
  
  it('should rate limit cmd with minTimeBetweenCmdCallMs', async () => {
    const user = users["Admin Dude"];

    const payload: TestCmdDto = {
      returnMessage: "Hello World"
    }

    const query: CrudQuery = {
      service: "user-profile",
      cmd: "testCmdRateLimited",
    }

    await testMethod({ url: '/crud/cmd', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});
    await new Promise(resolve => setTimeout(resolve, 350));
    await testMethod({ url: '/crud/cmd', method: 'POST', expectedCode: 429, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

    await new Promise(resolve => setTimeout(resolve, 150));
    await testMethod({ url: '/crud/cmd', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

  });


});