import { Test, TestingModule } from '@nestjs/testing';

import { getModule } from '../test.module';
import { CrudController } from '../../crud/crud.controller';
import { MyUserService } from '../myuser.service';
import { CrudAuthService } from '../../authentification/auth.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { UserProfile } from '../entities/UserProfile';
import { CrudQuery } from '../../crud/model/CrudQuery';
import { createAccountsAndProfiles, createMelons, createNewProfileTest, formatId, testMethod } from '../test.utils';
import { MyProfileService } from '../profile.service';
import { Melon } from '../entities/Melon';
import { CrudService } from '../../crud/crud.service';
import { TestUser } from '../test.utils';
import { CRUD_CONFIG_KEY, CrudConfigService } from '../../crud/crud.config.service';
import { format } from 'path';

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

    "Admin Dude": {
      email: "admin.dude@mail.com",
      role: "admin",
      bio: 'I am a sys admin.',
      profileType: "admin",
      skipProfile: true,
    }, 
    "Username Dude": {
      email: "Username.dude@mail.com",
      role: "admin",
      bio: 'I am a sys Username.',
      profileType: "admin",
      skipProfile: true,
    },
    "Michael Doe": {
      email: "michael.doe@test.com",
      role: "user",
      profileType: "admin",
      bio: 'I am a cool guy.',
    },
    "Sarah Doe": {
      email: "sarah.doe@test.com",
      role: "user",
      profileType: "admin",
      bio: 'I am a cool gal.',
    },
    "John Doe": {
      email: "john.doe@test.com",
      role: "user",
      profileType: "admin",
      bio: 'I am a cool gal.',
    },
    "Geoloc Dude": {
      email: "Geoloc.dude@mail.com",
      role: "admin",
      bio: 'I am a Geoloc admin.',
      profileType: "admin",
      skipProfile: true,
    },
    "Geoloc Transformed": {
      email: "Geoloc.Transformed@mail.com",
      role: "admin",
      bio: 'I am a Geoloc Transformed admin.',
      profileType: "admin",
      skipProfile: true,
    },
  }

  beforeAll(async () => {

    const moduleRef: TestingModule = await Test.createTestingModule(
      getModule('test-transform-db')
    ).compile();
    await moduleRef.get<EntityManager>(EntityManager).getConnection().getDb().dropDatabase();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    appController = app.get<CrudController>(CrudController);
    userService = app.get<MyUserService>(MyUserService);
    authService = app.get<CrudAuthService>(CrudAuthService);
    profileService = app.get<MyProfileService>(MyProfileService);
    entityManager = app.get<EntityManager>(EntityManager);
    crudConfig = app.get<CrudConfigService>(CRUD_CONFIG_KEY, { strict: false });
    const em = entityManager.fork();

    await createAccountsAndProfiles(users, em, userService, crudConfig, { testAdminCreds });


  });

    //@Post('/crud/one')
    it('should transform new profile decorated fields', async () => {
      const user = users["Admin Dude"];
      const userId = user.id;
      const payload: Partial<UserProfile> = {
        userName: "Admin Dude",
        user: userId,
        bio: 'I am a cool guy.',
        lowercaseTrimmedField: ' SHOULD BE LOWERCASED AND TRIMMED ',
        upperCaseField: 'should be uppercased',
     
      } as any;
      const query: CrudQuery = {
        service: 'user-profile'
      }
      const expectedObject = {
        userName: payload.userName,
        user: userId,
        bio: payload.bio,
        lowercaseTrimmedField: payload.lowercaseTrimmedField.toLowerCase().trim(),
        upperCaseField: payload.upperCaseField.toUpperCase(),
      }
  
      const res = await  testMethod({ expectedObject, url: '/crud/one', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});
  
    });


    it('should transform patched profile decorated fields', async () => {
      const user = users["Michael Doe"];
      const userId = user.id;
      const payload: Partial<UserProfile> = {
        lowercaseTrimmedField: ' SHOULD BE LOWERCASED AND TRIMMED 2 ',
        upperCaseField: 'should be uppercased 2',
     
      } as any;
      const query: CrudQuery = {
        service: 'user-profile',
        query: JSON.stringify({ user: userId })
      }
      const expectedObject = {
        lowercaseTrimmedField: payload.lowercaseTrimmedField.toLowerCase().trim(),
        upperCaseField: payload.upperCaseField.toUpperCase(),
      }
  
      const res = await  testMethod({ expectedObject, url: '/crud/one', method: 'PATCH', expectedCode: 200, app, jwt: user.jwt, entityManager, payload, query, crudConfig});
  

    });

    it('should validate POST nested geoloc thanks to $Type decorator', async () => {
      const user = users["Geoloc Dude"];
      const userId = user.id;
      const payload: Partial<UserProfile> = {
        userName: "Geoloc Dude",
        user: userId,
        bio: 'I am a cool guy.',
        geoloc: {
          city: 'New York',
          zip: '12345',
        }
      } as any;
      const query: CrudQuery = {
        service: 'user-profile'
      }
     
      await  testMethod({ url: '/crud/one', method: 'POST', expectedCode: 400, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

      payload.geoloc.zip = 12345 as any;

      const expectedObject = {
        geoloc: {
          city: payload.geoloc.city,
          zip: payload.geoloc.zip,
        }
      }
      await  testMethod({ expectedObject, url: '/crud/one', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

    });

    it('should validate PATCH nested geoloc thanks to $Type decorator', async () => {
      const user = users["Michael Doe"];
      const userId = user.id;
      const payload: Partial<UserProfile> = {
        geoloc: {
          city: 'New York',
          zip: '12345',
        }
      } as any;
      const query: CrudQuery = {
        service: 'user-profile',
        query: JSON.stringify({ user: userId })
      }
      await  testMethod({ url: '/crud/one', method: 'PATCH', expectedCode: 400, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

      payload.geoloc.zip = 12345 as any;

      const expectedObject = {
        geoloc: {
          city: payload.geoloc.city,
          zip: payload.geoloc.zip,
        }
      }
      await  testMethod({ expectedObject, url: '/crud/one', method: 'PATCH', expectedCode: 200, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

    });

    it('should transform POST nested geoloc thanks to $Type decorator', async () => {
      const user = users["Geoloc Transformed"];
      const userId = user.id;
      const payload: Partial<UserProfile> = {
        userName: "Geoloc Transformed",
        user: userId,
        bio: 'I am a cool guy.',
        geoloc: {
          street: ' 1234 SHOULD BE LOWERCASED AND TRIMMED ',
          city: 'New York',
          zip: 12345,
        }
      } as any;
      const query: CrudQuery = {
        service: 'user-profile'
      }

      const expectedObject = {
        geoloc: {
          street: payload.geoloc.street.toLowerCase().trim(),
          city: payload.geoloc.city,
          zip: payload.geoloc.zip,
        }
      }
      await  testMethod({ expectedObject, url: '/crud/one', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

    });

    it('should transform PATCH nested geoloc thanks to $Type decorator', async () => {
      const user = users["Sarah Doe"];
      const userId = user.id;
      const payload: Partial<UserProfile> = {
        geoloc: {
          street: ' 77 SHOULD BE LOWERCASED AND TRIMMED ',
          city: 'New York',
          zip: 12345,
        }
      } as any;
      const query: CrudQuery = {
        service: 'user-profile',
        query: JSON.stringify({ user: userId })
      }

      const expectedObject = {
        geoloc: {
          street: payload.geoloc.street.toLowerCase().trim(),
          city: payload.geoloc.city,
          zip: payload.geoloc.zip,
        }
      }
      await  testMethod({ expectedObject, url: '/crud/one', method: 'PATCH', expectedCode: 200, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

    });  
    
    it('should validate POST username length', async () => {
      const user = users["Username Dude"];
      const userId = user.id;
      const payload: Partial<UserProfile> = {
        userName: "Username Dude Fraudatifilius Plantagenet Ludwig Heinrich",
        user: userId,
        bio: 'I am a cool guy.',
      } as any;
      const query: CrudQuery = {
        service: 'user-profile'
      }

      await  testMethod({ url: '/crud/one', method: 'POST', expectedCode: 400, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

      payload.userName = "Username Heinrich";
      const expectedObject = {
        userName: payload.userName,
      }
      await  testMethod({ expectedObject, url: '/crud/one', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});
      
    });
    it('should validate PATCH username length', async () => {
      const user = users["John Doe"];
      const userId = user.id;
      const payload: Partial<UserProfile> = {
        userName: "John Doe Fraudatifilius Plantagenet Ludwig Heinrich",
      } as any;
      const query: CrudQuery = {
        service: 'user-profile',
        query: JSON.stringify({ user: userId })
      }

      await  testMethod({ url: '/crud/one', method: 'PATCH', expectedCode: 400, app, jwt: user.jwt, entityManager, payload, query, crudConfig});
      
      payload.userName = "John Heinrich";
      const expectedObject = {
        userName: payload.userName,
      }
      await  testMethod({ expectedObject, url: '/crud/one', method: 'PATCH', expectedCode: 200, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

    });
});