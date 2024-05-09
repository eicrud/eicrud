import { Test, TestingModule } from '@nestjs/testing';

import { getModule } from '../test.module';
import { CrudController } from '../../crud/crud.controller';
import { MyUserService } from '../myuser.service';
import { CrudAuthService } from '../../authentification/auth.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { UserProfile } from '../entities/UserProfile';
import { CrudQuery } from '../../crud/model/CrudQuery';
import { createAccountsAndProfiles, createMelons, createNewProfileTest, testMethod } from '../test.utils';
import { MyProfileService } from '../profile.service';
import { Melon } from '../entities/Melon';
import { CrudService } from '../../crud/crud.service';
import { TestUser } from '../test.utils';

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

    const em = entityManager.fork();

    await createAccountsAndProfiles(users, em, userService, { testAdminCreds });

    
  });

  //@Get('/crud/auth')
  it('should get auth', () => {
    return app
    .inject({
      method: 'GET',
      url: '/crud/auth',
      headers: {
        Authorization: `Bearer ${users["Michael Doe"].jwt}`
      }
    })
    .then((result) => {
      expect(result.statusCode).toEqual(200);
      expect(result.json().userId).toEqual(users["Michael Doe"].id?.toString());
    });
  });

  //@Post('/crud/one')
  it('should create a new profile (own id)', async () => {
    const userName = "John NoProfile";
    const user: TestUser = users[userName];
    const payload: Partial<UserProfile> = {
      userName,
      user: user.id,
      bio: user.bio,
      address: '1234 Main St.' // This should be removed
    } as any;
    const query: CrudQuery = {
      service: 'user-profile'
    }
    await createNewProfileTest(app, user.jwt, entityManager, payload, query);
  });  

  it('should inherit right to create own profile', async () => {
    const userName = "Trusted NoProfile";
    const user: TestUser = users[userName];
    const payload: Partial<UserProfile> = {
      userName,
      user: user.id,
      bio: user.bio,
      address: '1234 Main St.' // This should be removed
    } as any;
    const query: CrudQuery = {
      service: 'user-profile'
    }
    await createNewProfileTest(app, user.jwt, entityManager, payload, query);
  });

   it('should fail create a new profile (other id)', async () => {
    const userName = "John NoProfile";
    const user: TestUser = users[userName];
    const otherUser: TestUser = users["Michael Doe"];
    const bio_key = "SHOULD_FAIL_NEW_PROFILE_OTHER_ID";
    const payload: Partial<UserProfile> = {
      userName,
      user: otherUser.id,
      bio: bio_key,
    } as any;
    const query: CrudQuery = {
      service: 'user-profile'
    }
    const res = await  testMethod({ url: '/crud/one', method: 'POST', expectedCode: 403, app, jwt: user.jwt, entityManager, payload, query});
    let resDb = await entityManager.fork().findOne(UserProfile, { bio: bio_key }) as UserProfile;
    expect(resDb).toBeNull();
   }); 

   it('should fail create a new profile (other id, herited right)', async () => {
    const userName = "Trusted NoProfile";
    const user: TestUser = users[userName];
    const otherUser: TestUser = users["Michael Doe"];
    const bio_key = "SHOULD_FAIL_INHERITED_NEW_PROFILE_OTHER_ID";
    const payload: Partial<UserProfile> = {
      userName,
      user: otherUser.id,
      bio: bio_key,
    } as any;
    const query: CrudQuery = {
      service: 'user-profile'
    }
    const res = await  testMethod({ url: '/crud/one', method: 'POST', expectedCode: 403, app, jwt: user.jwt, entityManager, payload, query});
    let resDb = await entityManager.fork().findOne(UserProfile, { bio: bio_key }) as UserProfile;
    expect(resDb).toBeNull();
   });  

  //@Post('/crud/batch')
  it('should batch create new melon (own id)',async ()  => {
    const userName = "Trusted NoProfile";
    const user: TestUser = users[userName];
    const query: CrudQuery = {
      service: CrudService.getName(Melon)
    }
    const NB_MELONS = 5;
    const payload: any = createMelons(NB_MELONS, user);

    const res = await testMethod({ url: '/crud/batch', method: 'POST', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 201 });
    expect(res?.length).toEqual(NB_MELONS);
    let i = 0;
    for(const profile in res){
      const query = { id: userService.createNewId(res[profile].id) }; //Weird that I need to convert to objectId here
      const resDB = await entityManager.fork().findOne(Melon, query as any);
      expect(resDB.price).toEqual(i);
      i++;
    }
  });

    it('should fail batch create when one melon has forbidden property',async ()  => {
      const userName = "Trusted NoProfile";
      const user: TestUser = users[userName];
      const query: CrudQuery = {
        service: CrudService.getName(Melon)
      }
      const NB_MELONS = 5;
      const payload: any = createMelons(NB_MELONS, user);

      payload[2].size = 200;
  
      const res = await testMethod({ url: '/crud/batch', method: 'POST', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403 });

    });

  it('should fail batch create when over maxBatchSize',async ()  => {
    const userName = "Trusted NoProfile";
    const user: TestUser = users[userName];
    const query: CrudQuery = {
      service: CrudService.getName(Melon)
    }
    const NB_MELONS = 6;
    const payload: any = createMelons(NB_MELONS, user);
    const res = await testMethod({ url: '/crud/batch', method: 'POST', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403 });
  });
  

  it('should fail batch create when no maxBatchSize in rights',async ()  => {
    const userName = "Michael Doe";
    const user: TestUser = users[userName];
    const query: CrudQuery = {
      service: CrudService.getName(Melon)
    }
    const NB_MELONS = 5;
    const payload: any = createMelons(NB_MELONS, user);
    const res = await testMethod({ url: '/crud/batch', method: 'POST', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403 });
  });


/////////////////////////////////////////////////////////////////////////////

//   //@Get('/crud/one')
//   it('should find one profile by user',async ()  => {
//     const payload: Partial<UserProfile> = {
//     } as any;
//     const query: CrudQuery = {
//       service: 'user-profile',
//       query: JSON.stringify({ user: (sarahDoeProfile.user as any).id?.toString() })
//     }

//     const expectedObject = { 
//       bio: sarahDoeProfile.bio,
//      }

//     return testMethod({ url: '/crud/one', method: 'GET', app, jwt, entityManager, payload, query, expectedCode: 200, expectedObject });

//   });

//   //Get('/crud/many')
//   it('should find many profiles by bio',async ()  => {
//     const payload: Partial<UserProfile> = {
//     } as any;
//     const query: CrudQuery = {
//       service: 'user-profile',
//       query: JSON.stringify({ bio: 'BIO_FIND_KEY' })
//     }

//     const expectedObject =null;

//     const res = await testMethod({ url: '/crud/many', method: 'GET', app, jwt, entityManager, payload, query, expectedCode: 200, expectedObject });

//     expect(res.length).toEqual(3);
//     for(const profile in res){
//       expect(res[profile].bio).toEqual('BIO_FIND_KEY');
//     }

//   });
  
//   //@Get('/crud/in')
//   it('should find in profiles',async ()  => {
//     const payload: Partial<UserProfile> = {
//     } as any;
//     const ids = [];
//     for(const key in profiles){
//       ids.push((profiles[key].id as any).toString());
//     }
//     const query: CrudQuery = {
//       service: 'user-profile',
//       query: JSON.stringify({ id: ids })
//     }

//     const expectedObject =null;

//     const res = await testMethod({ url: '/crud/in', method: 'GET', app, jwt, entityManager, payload, query, expectedCode: 200, expectedObject });

//     expect(res.length).toEqual(ids.length);
//     expect(res[0].userName).toBeDefined();
//     expect(res[0].id).toBeDefined();

//   });
  
//   //@Patch('/crud/one')
//   it('should patch a profile', async  () => {
//     const sarahDoeProfile = profiles["Sarah Doe"];
//     const payload: Partial<UserProfile> = {
//       userName: 'Sarah Jane',
//       user: (sarahDoeProfile.user as any).id?.toString(),
//       fakeField: 'fake',
//     } as any;
//     const query: CrudQuery = {
//       service: 'user-profile',
//       query: JSON.stringify({ id: (sarahDoeProfile.id as any).toString() })
//     }

//     const expectedObject = { 
//       ...payload,
//       bio: sarahDoeProfile.bio,
//      }
//      delete (expectedObject as any).fakeField;

//      const fetchEntity = { entity: UserProfile, id: sarahDoeProfile.id };

//     let res = await testMethod({ url: '/crud/one', method: 'PATCH', app, jwt, entityManager, payload, query, expectedCode: 200, fetchEntity, expectedObject });
//     expect(res.userName).toBeDefined();
//     expect(res.fakeField).toBeUndefined();
//   });

//   //@Patch('/crud/in')
//   it('should patch in profiles',async ()  => {
//     const payload: Partial<UserProfile> = {
//       astroSign: 'Aries',
//     };
//     const ids = [];
//     for(const key in profiles){
//       ids.push((profiles[key].id as any).toString());
//     }
//     const query: CrudQuery = {
//       service: 'user-profile',
//       query: JSON.stringify({ id: ids })
//     }

//     const expectedObject =null;

//     const res = await testMethod({ url: '/crud/in', method: 'PATCH', app, jwt, entityManager, payload, query, expectedCode: 200, expectedObject });

//     expect(res.length).toEqual(ids.length);
//     for(const profile in profiles){
//       const resDB = await entityManager.fork().findOne(UserProfile, { id: profiles[profile].id });
//       expect(resDB.astroSign).toEqual('Aries');
//     }

//   });

//   //@Patch('/crud/batch')
//   it('should patch batch profiles',async ()  => {

//     const query: CrudQuery = {
//       service: 'user-profile',
//     }

//     const payloadArray = [];

//     for(const key in profilesToPatchBatch){
//       payloadArray.push({
//         query: { id: profilesToPatchBatch[key].id},
//         data: { astroSign: 'Taurus' }
//       });
//     }

//     const payload: any = payloadArray;

//     const expectedObject =null;

//     const res = await testMethod({ url: '/crud/batch', method: 'PATCH', app, jwt, entityManager, payload, query, expectedCode: 200, expectedObject });

//     expect(res?.length).toEqual(2);
//     for(const profile in profilesToPatchBatch){
//       const resDB = await entityManager.fork().findOne(UserProfile, { id: profilesToPatchBatch[profile].id });
//       expect(resDB.astroSign).toEqual('Taurus');
//     }

//   });

//   //@Delete('/crud/one')
//   it('should delete profile',async ()  => {
//     const payload: Partial<UserProfile> = {
//     } as any;
//     const query: CrudQuery = {
//       service: 'user-profile',
//       query: JSON.stringify({ id: (delmeProfile.id as any).toString() })
//     }

//     const expectedObject = null;

//     const res = await testMethod({ url: '/crud/one', method: 'DELETE', app, jwt, entityManager, payload, query, expectedCode: 200, expectedObject });
//     expect(res).toEqual(1);

//     const resDb = await entityManager.fork().findOne(UserProfile, { id: delmeProfile.id });
//     expect(resDb).toBeNull();

//   });

//   //@Delete('/crud/in')
//   it('should delete in profiles',async ()  => {
//     const payload: Partial<UserProfile> = {
//     } as any;
//     const ids = [];
//     for(const key in profilesToRemoveIn){
//       ids.push((profilesToRemoveIn[key].id as any).toString());
//     }
//     const query: CrudQuery = {
//       service: 'user-profile',
//       query: JSON.stringify({ id: ids })
//     }

//     const expectedObject = null;

//     const res = await testMethod({ url: '/crud/in', method: 'DELETE', app, jwt, entityManager, payload, query, expectedCode: 200, expectedObject });
//     expect(res).toEqual(ids.length);
    
//     for(const profile in profilesToRemoveIn) {
//       const resDb = await entityManager.fork().findOne(UserProfile, { id: profilesToRemoveIn[profile].id });
//       expect(resDb).toBeNull();
//     }

//   });

//   //@Delete('/crud/many')
//   it('should delete many profiles',async ()  => {
//     const payload: Partial<UserProfile> = {
//     } as any;
//     const query: CrudQuery = {
//       service: 'user-profile',
//       query: JSON.stringify({ bio: 'BIO_DELETE_KEY' })
//     }

//     const expectedObject = null;

//     const res = await testMethod({ url: '/crud/many', method: 'DELETE', app, jwt, entityManager, payload, query, expectedCode: 200, expectedObject });
//     expect(res).toEqual(2);
    
//     for(const profile in profilesToRemoveMany) {
//       const resDb = await entityManager.fork().findOne(UserProfile, { id: profilesToRemoveMany[profile].id });
//       expect(resDb).toBeNull();
//     }

//   });
});