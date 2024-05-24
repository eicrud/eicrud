import { Test, TestingModule } from '@nestjs/testing';

import { getModule, createNestApplication, readyApp, dropDatabases } from '../test.module';
import { CrudController } from '../../core/crud/crud.controller';
import { MyUserService } from '../myuser.service';
import { CrudAuthService } from '../../core/authentification/auth.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { UserProfile } from '../entities/UserProfile';
import { CrudQuery } from '../../shared/CrudQuery';
import { createAccountsAndProfiles,createMelons, createNewProfileTest,  testMethod } from '../test.utils';
import { MyProfileService } from '../profile.service';
import { Melon } from '../entities/Melon';
import { CrudService } from '../../core/crud/crud.service';
import { TestUser } from '../test.utils';
import { CRUD_CONFIG_KEY, CrudConfigService } from '../../core/crud/crud.config.service';
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
    "Moderator Joe": {
      email: "moderator.Joe@mail.com",
      role: "moderator",
      bio: 'I am a discord mod.',
      profileType: "basic",
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
      profileType: "basic",
      bio: 'I am a cool doe.',
    },    
    "John Henry": {
      email: "john.Henry@test.com",
      role: "user",
      profileType: "basic",
      bio: 'I am a cool doe.',
      lowercaseTrimmedField: 'should be lowercase and trimmed',
    },
    "John Don": {
      email: "john.Don@test.com",
      role: "user",
      profileType: "admin",
      bio: 'I am a cool Don.',
      skipProfile: true,
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
    "John NoProfile": {
      email: "john.noprofile@mail.com",
      role: "user",
      bio: 'I am a cool guy.',
      skipProfile: true
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

    it('should delete @$Delete() anotted field', async () => {
      const user = users["John Don"];
      const userId = user.id;
      const payload: Partial<UserProfile> = {
        userName: "John Don",
        user: userId,
        bio: 'I am a cool guy.',
        fieldToDelete: "Should be deleted",
      } as any;
      const query: CrudQuery = {
        service: 'user-profile'
      }
      const expectedObject = {
        userName: payload.userName,
        user: userId,
        bio: payload.bio,
        fieldToDelete: undefined,
      }
      await  testMethod({ expectedObject, url: '/crud/one', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});
    });

    it('should validate name stringified size when creating melon', async () => {
      const user = users["Michael Doe"];
      const payload: Partial<Melon> = {
        name: "M",
        price: 1,
        owner: crudConfig.dbAdapter.formatId(user.id, crudConfig),
        ownerEmail: user.email,
      } as any;

      
      const query: CrudQuery = {
        service: 'melon'
      }

      await  testMethod({ url: '/crud/one', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

      for(let i = 0; i <= 55; i++){
        payload.name += "e";
      }

      await testMethod({ url: '/crud/one', method: 'POST', expectedCode: 400, app, jwt: user.jwt, entityManager, payload, query, crudConfig});
      
    });

    it('should validate longName stringified size when creating melon', async () => {
      const user = users["Michael Doe"];
      const payload: Partial<Melon> = {
        longName: "M",
        name: "MyMelon",
        price: 1,
        owner: crudConfig.dbAdapter.formatId(user.id, crudConfig),
        ownerEmail: user.email,
      } as any;

      
      const query: CrudQuery = {
        service: 'melon'
      }

      for(let i = 0; i <= 55; i++){
        payload.longName += "e";
      }

      await testMethod({ url: '/crud/one', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});
      
      
      for(let i = 0; i <= 55; i++){
        payload.longName += "e";
      }

      await testMethod({ url: '/crud/one', method: 'POST', expectedCode: 400, app, jwt: user.jwt, entityManager, payload, query, crudConfig});


      //User with more trust 
      const trustedUser = users["Admin Dude"];

      payload.owner = crudConfig.dbAdapter.formatId(trustedUser.id, crudConfig);

      await testMethod({ url: '/crud/one', method: 'POST', expectedCode: 201, app, jwt: trustedUser.jwt, entityManager, payload, query, crudConfig});
      for(let i = 0; i <= 30; i++){
        payload.longName += "e";
      }
      await testMethod({ url: '/crud/one', method: 'POST', expectedCode: 400, app, jwt: trustedUser.jwt, entityManager, payload, query, crudConfig});
    });

    it('should validate nested seed name stringigied size when creating melon', async () => {
      const user = users["Michael Doe"];
      const payload: Partial<Melon> = {
        name: "MyMelon",
        price: 1,
        owner: crudConfig.dbAdapter.formatId(user.id, crudConfig),
        ownerEmail: user.email,
        seeds: [
          {
            name: "M",
            size: 1,
          }
        ]
      } as any;

      
      const query: CrudQuery = {
        service: 'melon'
      }

      await  testMethod({ url: '/crud/one', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

      for(let i = 0; i <= 10; i++){
        payload.seeds[0].name += "e";
      }

      await testMethod({ url: '/crud/one', method: 'POST', expectedCode: 400, app, jwt: user.jwt, entityManager, payload, query, crudConfig});
      
    });

    it('should validate nested slice name stringigied size when creating melon', async () => {
      const user = users["Michael Doe"];
      const payload: Partial<Melon> = {
        name: "MyMelon",
        price: 1,
        owner: crudConfig.dbAdapter.formatId(user.id, crudConfig),
        ownerEmail: user.email,
        firstSlice: {
          name: "M",
          size: 1,
        }
      } as any;

      
      const query: CrudQuery = {
        service: 'melon'
      }

      await  testMethod({ url: '/crud/one', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

      for(let i = 0; i <= 10; i++){
        payload.firstSlice.name += "e";
      }

      await testMethod({ url: '/crud/one', method: 'POST', expectedCode: 400, app, jwt: user.jwt, entityManager, payload, query, crudConfig});
      
    });

    it('should validate number of seeds when creating melon', async () => {
      const user = users["Michael Doe"];
      const payload: Partial<Melon> = {
        name: "MyMelon",
        price: 1,
        owner: crudConfig.dbAdapter.formatId(user.id, crudConfig),
        ownerEmail: user.email,
        seeds: [
          {
            name: "Seed",
            size: 1,
          }
        ]
      };

      const query: CrudQuery = {
        service: 'melon'
      }

      await testMethod({ url: '/crud/one', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});


      for(let i = 0; i < 6; i++){
        payload.seeds.push({
          name: "Seed" + i,
          size: 1,
        });
      }

      await testMethod({ url: '/crud/one', method: 'POST', expectedCode: 400, app, jwt: user.jwt, entityManager, payload, query, crudConfig});
    
      //User with more trust
      const trustedUser = users["Admin Dude"];
      payload.owner = crudConfig.dbAdapter.formatId(trustedUser.id, crudConfig);
      await testMethod({ url: '/crud/one', method: 'POST', expectedCode: 201, app, jwt: trustedUser.jwt, entityManager, payload, query, crudConfig});

      for(let i = 0; i < 8; i++){
        payload.seeds.push({
          name: "Seed" + i,
          size: 1,
        });
      }

      await testMethod({ url: '/crud/one', method: 'POST', expectedCode: 400, app, jwt: trustedUser.jwt, entityManager, payload, query, crudConfig});
    
    });

    it('should transform seed array twice when creating melon', async () => {
      const user = users["Michael Doe"];
      const payload: Partial<Melon> = {
        name: "MyMelon",
        price: 1,
        owner: crudConfig.dbAdapter.formatId(user.id, crudConfig),
        ownerEmail: user.email,
        seeds: [
          {
            name: "Seed",
            size: 1,
          },
          {
            name: "Seedxl",
            size: 2,
          },
          {
            name: "Filtered",
            size: 0,
          },
        ]
      };

      const query: CrudQuery = {
        service: 'melon'
      }

      const fetchEntity = {
        id: payload.id,
        entity: Melon,
      }

      const expectedObject = {
        name: payload.name,
        price: payload.price,
        owner: payload.owner,
        ownerEmail: payload.ownerEmail,
        seeds: [
          {
            size: payload.seeds[0].size,
            name: payload.seeds[0].name.toLowerCase(),
          }, 
          {
            size: payload.seeds[1].size,
            name: payload.seeds[1].name.toLowerCase(),
          }
        ]
      }

      await testMethod({ url: '/crud/one', method: 'POST', expectedObject, expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig, fetchEntity});

    });

    it('should validate nested seed array thanks to $type decorator' , async () => {
      const user = users["Michael Doe"];
      const payload: Partial<Melon> = {
        name: "MyMelon",
        price: 1,
        owner: crudConfig.dbAdapter.formatId(user.id, crudConfig),
        ownerEmail: user.email,
        seeds: [
          {
            name: "Seed",
            size: 1,
          },
          {
            name: "Seedxl",
            size: '2' as any,
          },
        ]
      };

      const query: CrudQuery = {
        service: 'melon'
      }

      const fetchEntity = {
        id: payload.id,
        entity: Melon,
      }

      await testMethod({ url: '/crud/one', method: 'POST', expectedCode: 400, app, jwt: user.jwt, entityManager, payload, query, crudConfig, fetchEntity});

    });

    it('should validate query for GET melon', async () => {
      const user = users["Michael Doe"];

      const query: CrudQuery = {
        service: 'melon',
        query: JSON.stringify({ owner: user.id, name: 111 })
      }

      const payload = {}	

      await testMethod({ url: '/crud/many', method: 'GET', expectedCode: 400, app, jwt: user.jwt, entityManager, query, crudConfig, payload});

      query.query = JSON.stringify({ owner: user.id, name: "MyMelon" });

      await testMethod({ url: '/crud/many', method: 'GET', expectedCode: 200, app, jwt: user.jwt, entityManager, query, crudConfig, payload});
      
    });

    it('should transform query for GET profile', async () => {

      const user = users["Moderator Joe"];
      const resUsername = "John Henry"
      const resUser = users[resUsername];

      const query: CrudQuery = {
        service: 'user-profile',
        query: JSON.stringify({ type: 'basic', lowercaseTrimmedField: "  SHOULD BE LOWERCASE AND TRIMMED  "} as Partial<UserProfile>)
      }

      const payload = {}

      const expectedObject = {
        type: 'basic',
        userName: resUsername,
        lowercaseTrimmedField: resUser.lowercaseTrimmedField.toLowerCase().trim(),
      }

      await testMethod({ url: '/crud/one', method: 'GET', expectedObject, expectedCode: 200, app, jwt: user.jwt, entityManager, query, crudConfig, payload});

    });

    it('should validate & transform query for PATCH profile', async () => {

      const user = users["Admin Dude"];
      const resUsername = "John Henry"
      const resUser = users[resUsername];

      const query: CrudQuery = {
        service: 'user-profile',
        query: JSON.stringify({ type: 2222 as any, lowercaseTrimmedField: "  SHOULD BE LOWERCASE AND TRIMMED  "} as Partial<UserProfile>)
      }

      const payload: Partial<UserProfile> = {
        astroSign: "Pisces", 
      }

      const fetchEntity = {
        id: resUser.profileId,
        entity: UserProfile,
      }

      const expectedObject = {
        type: 'basic',
        userName: resUsername,
        lowercaseTrimmedField: resUser.lowercaseTrimmedField.toLowerCase().trim(),
        astroSign: payload.astroSign,
      }


      await testMethod({ url: '/crud/one', method: 'PATCH', expectedCode: 400, app, jwt: user.jwt, entityManager, query, crudConfig, payload});


      query.query = JSON.stringify({ type: "basic", lowercaseTrimmedField: "  SHOULD BE LOWERCASE AND TRIMMED  "} as Partial<UserProfile>)


      await testMethod({ url: '/crud/one', method: 'PATCH', expectedObject, fetchEntity, expectedCode: 200, app, jwt: user.jwt, entityManager, query, crudConfig, payload});

    });


});