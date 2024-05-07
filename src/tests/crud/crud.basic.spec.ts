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
  let sarahDoeProfile: UserProfile;
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

    const sarahDoe = await userService.createAccount(testAdminCreds.email,testAdminCreds.password, null, "super_admin" );

    const em = entityManager.fork();

    sarahDoeProfile = em.create(UserProfile, {
      _id: new ObjectId() as any,
      userName: "Sarah Doe",
      user: sarahDoe.userId,
      bio: 'I am a cool girl.',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    em.persistAndFlush(sarahDoeProfile);

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

  // it('should create a new profile', () => {
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

  //   return testMethod({ url: '/crud/one', method: 'POST', expectedCode: 201, app, jwt, entityManager, payload, query});

  // });  



  // it('should patch a profile', () => {
  //   const payload: Partial<UserProfile> = {
  //     _id: sarahDoeProfile._id,
  //     userName: 'Sarah Jane',
  //     user: (sarahDoeProfile.user as any)._id?.toString(),
  //   } as any;
  //   const query: CrudQuery = {
  //     service: 'user-profile',
  //   }

  //   const expectedObject = { 
  //     ...payload,
  //     bio: sarahDoeProfile.bio,
  //    }
  //    delete expectedObject._id;

  //   return testMethod({ url: '/crud/one', method: 'PATCH', app, jwt, entityManager, payload, query, expectedCode: 200, fetchEntity: { entity: UserProfile, id: sarahDoeProfile._id }, expectedObject });

  // });

  it('should find profile by user',async ()  => {
    const payload: Partial<UserProfile> = {
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ user: (sarahDoeProfile.user as any)._id?.toString() })
    }

    const expectedObject = { 
      bio: sarahDoeProfile.bio,
     }

    return testMethod({ url: '/crud/one', method: 'GET', app, jwt, entityManager, payload, query, expectedCode: 200, expectedObject });

  });
});