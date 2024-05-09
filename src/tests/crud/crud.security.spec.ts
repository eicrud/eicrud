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
      "Michael Doe" : {
          email: "michael.doe@test.com",
          role: "user",
          bio: 'I am a cool guy.',
      },
      "Sarah Doe" :{
          email: "sarah.doe@test.com",
          role: "user",
          bio: 'I am a cool girl.',
          melons: 5
      },
      "John NoProfile" :{
          email: "john.noprofile@mail.com",
          role: "user",
          bio: 'I am a cool guy.',
          skipProfile: true
      },
      "Hack NoProfile" :{
          email: "hack.noprofile@mail.com",
          role: "user",
          bio: 'I am a cool guy.',
          skipProfile: true
      },
      "Greed NoProfile" :{
          email: "greed.noprofile@mail.com",
          role: "user",
          bio: 'I am a cool guy.',
          skipProfile: true
      },
      "Trusted NoProfile" :{
          email: "trustedgreed.noprofile@mail.com",
          role: "trusted_user",
          bio: 'I am a cool guy.',
          skipProfile: true
      },
  }

  beforeAll(async () => {

    const moduleRef: TestingModule = await Test.createTestingModule(
      getModule('security-test-db')
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

  // //@Get('/crud/auth')
  // it('should get auth', () => {
  //   return app
  //   .inject({
  //     method: 'GET',
  //     url: '/crud/auth',
  //     headers: {
  //       Authorization: `Bearer ${users["Michael Doe"].jwt}`
  //     }
  //   })
  //   .then((result) => {
  //     expect(result.statusCode).toEqual(200);
  //     expect(result.json().userId).toEqual(users["Michael Doe"].id?.toString());
  //   });
  // });

  // //@Post('/crud/one')
  // it('should create a new profile (own id)', async () => {
  //   const userName = "John NoProfile";
  //   const user: TestUser = users[userName];
  //   const payload: Partial<UserProfile> = {
  //     userName,
  //     user: user.id,
  //     bio: user.bio,
  //     address: '1234 Main St.' // This should be removed
  //   } as any;
  //   const query: CrudQuery = {
  //     service: 'user-profile'
  //   }
  //   await createNewProfileTest(app, user.jwt, entityManager, payload, query, crudConfig);
  // });  

  // it('should inherit right to create own profile', async () => {
  //   const userName = "Trusted NoProfile";
  //   const user: TestUser = users[userName];
  //   const payload: Partial<UserProfile> = {
  //     userName,
  //     user: user.id,
  //     bio: user.bio,
  //     address: '1234 Main St.' // This should be removed
  //   } as any;
  //   const query: CrudQuery = {
  //     service: 'user-profile'
  //   }
  //   await createNewProfileTest(app, user.jwt, entityManager, payload, query, crudConfig);
  // });

  //  it('should fail create a new profile (other id)', async () => {
  //   const userName = "John NoProfile";
  //   const user: TestUser = users[userName];
  //   const otherUser: TestUser = users["Michael Doe"];
  //   const bio_key = "SHOULD_FAIL_NEW_PROFILE_OTHER_ID";
  //   const payload: Partial<UserProfile> = {
  //     userName,
  //     user: otherUser.id,
  //     bio: bio_key,
  //   } as any;
  //   const query: CrudQuery = {
  //     service: 'user-profile'
  //   }
  //   const res = await  testMethod({ crudConfig, url: '/crud/one', method: 'POST', expectedCode: 403, app, jwt: user.jwt, entityManager, payload, query});
  //   let resDb = await entityManager.fork().findOne(UserProfile, { bio: bio_key }) as UserProfile;
  //   expect(resDb).toBeNull();
  //  }); 

  //  it('should fail create a new profile (other id, herited right)', async () => {
  //   const userName = "Trusted NoProfile";
  //   const user: TestUser = users[userName];
  //   const otherUser: TestUser = users["Michael Doe"];
  //   const bio_key = "SHOULD_FAIL_INHERITED_NEW_PROFILE_OTHER_ID";
  //   const payload: Partial<UserProfile> = {
  //     userName,
  //     user: otherUser.id,
  //     bio: bio_key,
  //   } as any;
  //   const query: CrudQuery = {
  //     service: 'user-profile'
  //   }
  //   const res = await  testMethod({ crudConfig, url: '/crud/one', method: 'POST', expectedCode: 403, app, jwt: user.jwt, entityManager, payload, query});
  //   let resDb = await entityManager.fork().findOne(UserProfile, { bio: bio_key }) as UserProfile;
  //   expect(resDb).toBeNull();
  //  });  

  // //@Post('/crud/batch')
  // it('should batch create new melon (own id)',async ()  => {
  //   const userName = "Trusted NoProfile";
  //   const user: TestUser = users[userName];
  //   const query: CrudQuery = {
  //     service: CrudService.getName(Melon)
  //   }
  //   const NB_MELONS = 5;
  //   const payload: any = createMelons(NB_MELONS, user, crudConfig);;

  //   const res = await testMethod({ crudConfig, url: '/crud/batch', method: 'POST', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 201 });
  //   expect(res?.length).toEqual(NB_MELONS);
  //   let i = 0;
  //   for(const profile in res){
  //     const query = { id: userService.createNewId(res[profile].id) }; //Weird that I need to convert to objectId here
  //     const resDB = await entityManager.fork().findOne(Melon, query as any);
  //     expect(resDB.price).toEqual(i);
  //     i++;
  //   }
  // });

  // it('should fail batch create when one melon has forbidden property',async ()  => {
  //     const userName = "Trusted NoProfile";
  //     const user: TestUser = users[userName];
  //     const query: CrudQuery = {
  //       service: CrudService.getName(Melon)
  //     }
  //     const NB_MELONS = 5;
  //     const payload: any = createMelons(NB_MELONS, user, crudConfig);;

  //     payload[2].size = 200;
  
  //     const res = await testMethod({ crudConfig, url: '/crud/batch', method: 'POST', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403 });

  // });

  // it('should fail batch create when over maxBatchSize',async ()  => {
  //   const userName = "Trusted NoProfile";
  //   const user: TestUser = users[userName];
  //   const query: CrudQuery = {
  //     service: CrudService.getName(Melon)
  //   }
  //   const NB_MELONS = 6;
  //   const payload: any = createMelons(NB_MELONS, user, crudConfig);
  //   const res = await testMethod({ crudConfig, url: '/crud/batch', method: 'POST', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403 });
  // });
  
  // it('should fail batch create when no maxBatchSize in rights',async ()  => {
  //   const userName = "Michael Doe";
  //   const user: TestUser = users[userName];
  //   const query: CrudQuery = {
  //     service: CrudService.getName(Melon)
  //   }
  //   const NB_MELONS = 5;
  //   const payload: any = createMelons(NB_MELONS, user, crudConfig);
  //   const res = await testMethod({ crudConfig, url: '/crud/batch', method: 'POST', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403 });
  // });


  //@Get('/crud/one')
  it('should find one profile by user',async ()  => {
    const userName = "Michael Doe";
    const user: TestUser = users[userName];
    const payload: Partial<UserProfile> = {
    } as any; 
    const query: CrudQuery = {
      service: 'user-profile', 
      query: JSON.stringify({ user: formatId(user.id as any, crudConfig) })
    }
    const expectedObject = { 
      bio: user.bio,
    }
    return testMethod({ url: '/crud/one', method: 'GET', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 200, expectedObject, crudConfig });
  });

    it('should not find other profile by user',async ()  => {
      const userName = "Michael Doe";
      const user: TestUser = users[userName];
      const otherUser: TestUser = users["Sarah Doe"];
      const payload: Partial<UserProfile> = {
      } as any; 
      const query: CrudQuery = {
        service: 'user-profile', 
        query: JSON.stringify({ user: formatId(otherUser.id as any, crudConfig) })
      }
      const expectedObject = { 
      }
      return testMethod({ expectedCode: 403, url: '/crud/one', method: 'GET', app, jwt: user.jwt, entityManager, payload, query, expectedObject, crudConfig });
    });

    it('should find melon from other user', async () => {
      const userName = "Michael Doe";
      const user: TestUser = users[userName];
      const otherUser: TestUser = users["Sarah Doe"];
      const payload: Partial<Melon> = {
      } as any; 
      const query: CrudQuery = {
        service: CrudService.getName(Melon), 
        query: JSON.stringify({ owner: formatId(otherUser.id as any, crudConfig) })
      }
      const expectedObject: Partial<Melon> = {
        ownerEmail: otherUser.email,
      }
      return testMethod({ expectedCode: 200, url: '/crud/one', method: 'GET', app, jwt: user.jwt, entityManager, payload, query, expectedObject, crudConfig });
    }
    );


});