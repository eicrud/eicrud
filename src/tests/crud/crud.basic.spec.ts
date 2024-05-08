import { Test, TestingModule } from '@nestjs/testing';

import { getModule } from '../test.module';
import { CrudController } from '../../crud/crud.controller';
import { MyUserService } from '../myuser.service';
import { CrudAuthService } from '../../authentification/auth.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { UserProfile } from '../entities/UserProfile';
import { CrudQuery } from '../../crud/model/CrudQuery';
import { testMethod } from '../test.utils';

const testAdminCreds = {
  email: "admin@testmail.com",
  password: "testpassword"
}

describe('AppController', () => {
  let appController: CrudController;
  let userService: MyUserService;
  let authService: CrudAuthService;
  let jwt: string;
  let app: NestFastifyApplication;
  let userId: string;
  let profiles: Record<string,UserProfile> = {};

  let entityManager: EntityManager;


  beforeAll(async () => {

    const moduleRef: TestingModule = await Test.createTestingModule(
      getModule('basic-test-db')
    ).compile();
    await moduleRef.get<EntityManager>(EntityManager).getConnection().getDb().dropDatabase();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    appController = app.get<CrudController>(CrudController);
    userService = app.get<MyUserService>(MyUserService);
    authService = app.get<CrudAuthService>(CrudAuthService);
    entityManager = app.get<EntityManager>(EntityManager);

    const sarahDoe = await userService.createAccount("sarah.doe@test.com",testAdminCreds.password, null, "super_admin" );
    const michaelDoe = await userService.createAccount("michael.doe@test.com",testAdminCreds.password, null, "super_admin" );
    const jordanDoe = await userService.createAccount("jordan.doe@test.com",testAdminCreds.password, null, "super_admin" );

    const em = entityManager.fork();

    const profilesToCreate = [];
    profilesToCreate.push({ userName: "Michael Doe", user: michaelDoe.userId, bio: 'I am a cool M.'})
    profilesToCreate.push({ userName: "Jordan Doe", user: jordanDoe.userId, bio: 'I am a cool J.'})
    profilesToCreate.push({ userName: "Sarah Doe", user: sarahDoe.userId, bio: 'I am a cool girl.'})
    profilesToCreate.forEach((profile) => {
      const key = profile.userName;
      profiles[key] = em.create(UserProfile, {
        id: new ObjectId() as any,
        userName: profile.userName,
        user: profile.user,
        bio: profile.bio,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      em.persistAndFlush(profiles[key]);

    });


    const accRes = await userService.createAccount(testAdminCreds.email,testAdminCreds.password, null, "super_admin" );
    jwt = accRes.accessToken;
    userId = accRes.userId?.toString();
    
  });

  beforeEach(async () => {


  });

  // it('should get auth', () => {
  //   return app
  //   .inject({
  //     method: 'GET',
  //     url: '/crud/auth',
  //     headers: {
  //       Authorization: `Bearer ${jwt}`
  //     }
  //   })
  //   .then((result) => {
  //     expect(result.statusCode).toEqual(200);
  //     expect(result.json().userId).toEqual(userId);
  //   });
  // });

  // it('should create a new profile', async () => {
  //   const payload: Partial<UserProfile> = {
  //     userName: "John Doe",
  //     user: userId,
  //     bio: 'I am a cool guy.',
  //     address: {
  //       street: '1234 Elm St.',
  //       city: 'Springfield'
  //     }
  //   } as any;
  //   const query: CrudQuery = {
  //     service: 'user-profile'
  //   }
    

  //   const res = await  testMethod({ url: '/crud/one', method: 'POST', expectedCode: 201, app, jwt, entityManager, payload, query});
    
  //   expect(res.address).toBeUndefined();
  // });  



  // it('should patch a profile', async  () => {
  //   const sarahDoeProfile = profiles["Sarah Doe"];
  //   const payload: Partial<UserProfile> = {
  //     id: sarahDoeProfile.id,
  //     userName: 'Sarah Jane',
  //     user: (sarahDoeProfile.user as any).id?.toString(),
  //     fakeField: 'fake',
  //   } as any;
  //   const query: CrudQuery = {
  //     service: 'user-profile',
  //   }

  //   const expectedObject = { 
  //     ...payload,
  //     bio: sarahDoeProfile.bio,
  //    }
  //    delete (expectedObject as any).fakeField;

  //    const fetchEntity = { entity: UserProfile, id: sarahDoeProfile.id };

  //   let res = await testMethod({ url: '/crud/one', method: 'PATCH', app, jwt, entityManager, payload, query, expectedCode: 200, fetchEntity, expectedObject });
  //   expect(res.userName).toBeDefined();
  //   expect(res.fakeField).toBeUndefined();
  // });

  // it('should find profile by user',async ()  => {
  //   const payload: Partial<UserProfile> = {
  //   } as any;
  //   const query: CrudQuery = {
  //     service: 'user-profile',
  //     query: JSON.stringify({ user: (sarahDoeProfile.user as any).id?.toString() })
  //   }

  //   const expectedObject = { 
  //     bio: sarahDoeProfile.bio,
  //    }

  //   return testMethod({ url: '/crud/one', method: 'GET', app, jwt, entityManager, payload, query, expectedCode: 200, expectedObject });

  // });

  it('should find in profilesId',async ()  => {
    const payload: Partial<UserProfile> = {
    } as any;
    const ids = [];
    for(const key in profiles){
      ids.push((profiles[key].id as any).toString());
    }
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: ids })
    }

    const expectedObject =null;

    const res = await testMethod({ url: '/crud/in', method: 'GET', app, jwt, entityManager, payload, query, expectedCode: 200, expectedObject });

    expect(res.length).toEqual(ids.length);
    expect(res[0].userName).toBeDefined();
    expect(res[0].id).toBeDefined();

  });

  it('should patch in profilesId',async ()  => {
    const payload: Partial<UserProfile> = {
      astroSign: 'Aries',
    };
    const ids = [];
    for(const key in profiles){
      ids.push((profiles[key].id as any).toString());
    }
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: ids })
    }

    const expectedObject =null;

    const res = await testMethod({ url: '/crud/in', method: 'PATCH', app, jwt, entityManager, payload, query, expectedCode: 200, expectedObject });

    expect(res.length).toEqual(ids.length);
    for(const profile of res){
      expect(profile.astroSign).toEqual('Aries');
    }

  });
});