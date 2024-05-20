import { Test, TestingModule } from '@nestjs/testing';

import { getModule, createNestApplication, readyApp, dropDatabases } from '../test.module';
import { CrudController } from '../../core/crud/crud.controller';
import { MyUserService } from '../myuser.service';
import { CrudAuthService } from '../../core/authentification/auth.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { UserProfile } from '../entities/UserProfile';
import { CrudQuery } from '../../core/crud/model/CrudQuery';
import { createAccountsAndProfiles, createMelons, createNewProfileTest, testMethod } from '../test.utils';
import { MyProfileService, TestCmdDto } from '../profile.service';
import { Melon } from '../entities/Melon';
import { CrudService } from '../../core/crud/crud.service';
import { TestUser } from '../test.utils';
import { CRUD_CONFIG_KEY, CrudConfigService } from '../../core/crud/crud.config.service';
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
      melons: 10000
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

  it('should ensure maximum limit when GET melon', async () => {
    
    const user = users["Michael Doe"];

    const payload = {}

    let query: CrudQuery = {
      service: "melon",
      query: "{}",
    }

    let res = await testMethod({ url: '/crud/many', method: 'GET', expectedCode: 200, app, jwt: user.jwt, entityManager, payload, query, crudConfig, returnLimitAndTotal: true});

    expect(res.data.length).toBe(crudConfig.limitOptions.NON_ADMIN_LIMIT_QUERY);


    query = {
      service: "melon",
      query: "{}",
      options: JSON.stringify({
        limit: 99999999999999999999
      }) as any
    }

    const res2 = await testMethod({ url: '/crud/many', method: 'GET', expectedCode: 200, app, jwt: user.jwt, entityManager, payload, query, crudConfig, returnLimitAndTotal: true});

    expect(res2.data.length).toBe(crudConfig.limitOptions.NON_ADMIN_LIMIT_QUERY);


  });

  it('should ensure limit when specified', async () => {

    const user = users["Michael Doe"];

    const payload = {}

    const query: CrudQuery = {
      service: "melon",
      query: "{}",
      options: JSON.stringify({
        limit: 5
      }) as any
    }

    const res = await testMethod({ url: '/crud/many', method: 'GET', expectedCode: 200, app, jwt: user.jwt, entityManager, payload, query, crudConfig, returnLimitAndTotal: true});

    expect(res.data.length).toBe(5);

  });

  it('should ensure limit when admin GET melon', async () => {
      
      const user = users["Admin Dude"];
  
      const payload = {}
  
      const query: CrudQuery = {
        service: "melon",
        query: "{}",
      }
  
      const res = await testMethod({ url: '/crud/many', method: 'GET', expectedCode: 200, app, jwt: user.jwt, entityManager, payload, query, crudConfig, returnLimitAndTotal: true});
  
      expect(res.data.length).toBe(crudConfig.limitOptions.ADMIN_LIMIT_QUERY);  
  });

  it('should limit number of MELON per users', async () => {
    const user = users["Jon Doe"];
    const baseMelon: Partial<Melon> = {
      price: 10,
      owner: user.id,
      ownerEmail: user.email,
    }

    const query: CrudQuery = {
      service: "melon",
    }

    const promises = [];
    for(let i = 0; i < 10; i++){
      const payload = {
        ...baseMelon,
        name: `Melon ${i}`,
      }
      const prom = testMethod({ url: '/crud/one', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});
      promises.push(prom);
    }

    await Promise.all(promises);
    //50ms delay
    await new Promise((r) => setTimeout(r, 50));
    
    const payload = {
      ...baseMelon,
      name: `Melon too much`,
    }
    const res = await testMethod({ url: '/crud/one', method: 'POST', expectedCode: 403, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

    query.query = JSON.stringify({owner: user.id});
    //Delete melons
    const res2 = await testMethod({ url: '/crud/many', method: 'DELETE', expectedCode: 200, app, jwt: user.jwt, entityManager, payload: {}, query, crudConfig});
    expect(res2).toBe(10);

    delete query.query;
    const res3 = await testMethod({ url: '/crud/one', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

  });

  it('trusted user be able to create more MELONs', async () => {
    const user = users["Admin Dude"]
    const baseMelon: Partial<Melon> = {
      price: 10,
      owner: user.id,
      ownerEmail: user.email,
    }

    const query: CrudQuery = {
      service: "melon",
    }

    const promises = [];
    for(let i = 0; i < 14; i++){
      const payload = {
        ...baseMelon,
        name: `Melon ${i}`,
      }
      const prom = testMethod({ url: '/crud/one', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});
      promises.push(prom);
    }

    await Promise.all(promises);
    //50ms delay
    await new Promise((r) => setTimeout(r, 50));
    
    const payload = {
      ...baseMelon,
      name: `Melon too much`,
    }
    const res = await testMethod({ url: '/crud/one', method: 'POST', expectedCode: 403, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

    query.query = JSON.stringify({owner: user.id});
    //Delete melons
    const res2 = await testMethod({ url: '/crud/many', method: 'DELETE', expectedCode: 200, app, jwt: user.jwt, entityManager, payload: {}, query, crudConfig});
    expect(res2).toBe(14);

    delete query.query;
    const res3 = await testMethod({ url: '/crud/one', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

  });

  it('should limit number of cmd uses per user', async () => {
    const user = users["Jon Doe"];

    const payload: TestCmdDto = {
      returnMessage: "Hello World"
    }

    const query: CrudQuery = {
      service: "user-profile",
      cmd: "testCmd",
    }

    const promises = [];
    for(let i = 0; i < 10; i++){
      const prom = testMethod({ url: '/crud/cmd', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});
      promises.push(prom);
    }

    await Promise.all(promises);

    //50ms delay
    await new Promise((r) => setTimeout(r, 50));

    const res = await testMethod({ url: '/crud/cmd', method: 'POST', expectedCode: 403, app, jwt: user.jwt, entityManager, payload, query, crudConfig});


  });

  it('trusted user should be able to use more cmd', async () => {
    const user = users["Admin Dude"];

    const payload: TestCmdDto = {
      returnMessage: "Hello World"
    }

    const query: CrudQuery = {
      service: "user-profile",
      cmd: "testCmd",
    }

    const promises = [];
    for(let i = 0; i < 14; i++){
      const prom = testMethod({ url: '/crud/cmd', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});
      promises.push(prom);
    }

    await Promise.all(promises);

    //50ms delay
    await new Promise((r) => setTimeout(r, 50));

    const res = await testMethod({ url: '/crud/cmd', method: 'POST', expectedCode: 403, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

  });


});