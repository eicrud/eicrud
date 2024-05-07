import { Test, TestingModule } from '@nestjs/testing';

import { getModule } from '../test.module';
import { CrudController } from '../../crud/crud.controller';
import { MyUserService } from '../myuser.service';
import { CrudAuthService } from '../../authentification/auth.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { UserProfile } from '../entities/UserProfile';
import { CrudQuery } from '../../crud/model/CrudQuery';

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
    moduleRef.get<EntityManager>(EntityManager).getConnection().getDb().dropDatabase();
    
  });

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule(
      getModule('basic-test-db')
    ).compile();

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
  //   return app
  //     .inject({
  //       method: 'POST',
  //       url: '/crud/one',
  //       headers: {
  //         Authorization: `Bearer ${jwt}`
  //       },
  //       payload,
  //       query: query as any
  //     })
  //     .then((result) => {
  //       expect(result.statusCode).toEqual(201);
  //     });

  // });  
  
  // it('should patch a new profile', () => {
  //   const payload: Partial<UserProfile> = {
  //     bio: 'I am a cool gal.',
  //     address: {
  //       street: '1234 Elm St.',
  //       city: 'Springfield'
  //     }
  //   } as any;
  //   const query: CrudQuery = {
  //     service: 'user-profile',
  //     query: JSON.stringify({ _id: sarahDoeProfile._id })

  //   }
  //   return app
  //     .inject({
  //       method: 'PATCH',
  //       url: '/crud/one',
  //       headers: {
  //         Authorization: `Bearer ${jwt}`
  //       },
  //       payload,
  //       query: new URLSearchParams(query as any).toString()
  //     })
  //     .then((result) => {
  //       expect(result.statusCode).toEqual(200);
  //     });

  // });


  it('should put a new profile', () => {
    const payload: Partial<UserProfile> = {
      _id: sarahDoeProfile._id,
      userName: 'Sarah Jane',
      user: (sarahDoeProfile.user as any)._id?.toString(),
      address: {
        street: '1234 Elm St.',
        city: 'Springfield'
      }
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
    }
    return app
      .inject({
        method: 'PUT',
        url: '/crud/one',
        headers: {
          Authorization: `Bearer ${jwt}`
        },
        payload,
        query: new URLSearchParams(query as any).toString()
      })
      .then(async (result) => {
        expect(result.statusCode).toEqual(200);
        const res = await entityManager.fork().findOne(UserProfile, { _id: sarahDoeProfile._id }, { populate: ['user'] });
        expect(res?.userName).toEqual('Sarah Jane');
        expect(res?.bio).toEqual('Sarah Jane');
      });

  });
});