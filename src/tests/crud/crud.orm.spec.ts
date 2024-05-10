import { Test, TestingModule } from '@nestjs/testing';

import { getModule } from '../test.module';
import { CrudController } from '../../crud/crud.controller';
import { MyUserService } from '../myuser.service';
import { CrudAuthService } from '../../authentification/auth.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager } from '@mikro-orm/mongodb';
import { UserProfile } from '../entities/UserProfile';
import { CrudQuery } from '../../crud/model/CrudQuery';
import { createAccountsAndProfiles, createNewProfileTest, formatId, testMethod } from '../test.utils';
import { MyProfileService } from '../profile.service';
import { CRUD_CONFIG_KEY, CrudConfigService } from '../../crud/crud.config.service';
import { TestUser } from '../test.utils';
import e from 'express';

const testAdminCreds = {
  email: "admin@testmail.com",
  password: "testpassword"
}

describe('AppController', () => {
  let appController: CrudController;
  let userService: MyUserService;
  let authService: CrudAuthService;
  let profileService: MyProfileService;
  let jwt: string;
  let app: NestFastifyApplication;
  let userId: string;
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
      getModule('test-orm-db')
    ).compile();
    await moduleRef.get<EntityManager>(EntityManager).getConnection().getDb().dropDatabase();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    crudConfig = moduleRef.get<CrudConfigService>(CRUD_CONFIG_KEY,{ strict: false });
    appController = app.get<CrudController>(CrudController);
    userService = app.get<MyUserService>(MyUserService);
    authService = app.get<CrudAuthService>(CrudAuthService);
    profileService = app.get<MyProfileService>(MyProfileService);
    entityManager = app.get<EntityManager>(EntityManager);

    const em = entityManager.fork();
  
    await createAccountsAndProfiles(users, em, userService, crudConfig, { usersWithoutProfiles, testAdminCreds });

    const accRes = await userService.createAccount(testAdminCreds.email,testAdminCreds.password, null, "super_admin" );
    jwt = accRes.accessToken;
    userId = formatId(accRes.userId, crudConfig);
    
  }, 10000);

  //@Post('/crud/one')
  it('should not allow duplicate username @Unique()', async () => {
    const user = users["Sarah Doe"];
    const payload: Partial<UserProfile> = {
      userName: "Michael Doe",
      user: user.id,
      bio: 'I am a cool guy.',
    } as any;
    const query: CrudQuery = {
      service: 'user-profile'
    }

    await createNewProfileTest(app, jwt, entityManager, payload, query, crudConfig, 500);

  });  

  it('create should add default values, and unknown value should be removed', async () => {
    const payload: Partial<UserProfile> = {
      userName: "John Doe",
      user: userId,
      bio: 'I am a cool guy.',
      address: { // This should be removed
        street: '1234 Elm St.',
        city: 'Springfield'
      }
    } as any;
    const query: CrudQuery = {
      service: 'user-profile'
    }
    const res = await  testMethod({ url: '/crud/one', method: 'POST', expectedCode: 201, app, jwt: jwt, entityManager, payload, query, crudConfig});

    let resDb = await entityManager.fork().findOne(UserProfile, { id: res[crudConfig.id_field] }) as UserProfile;
    resDb = JSON.parse(JSON.stringify(res));
    expect(res.address).toBeUndefined();
    expect((resDb as any).address).toBeUndefined();
    expect(res.favoriteColor).toEqual("blue");
    expect(resDb.favoriteColor).toEqual("blue");
    return res;
  });

  it('patch should not modify unprovided default values, and unknown value should be removed', async () => {
    const user: Partial<TestUser> = users["John Red"];
    
    const payload: Partial<UserProfile> = {
      userName: 'John Green',
      fakeField: 'fake',
    } as any;
    const formatedId = formatId(user.profileId, crudConfig);
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: formatedId })
    }

    const expectedObject = {
      ...payload,
      bio: user.bio,
    }
    delete (expectedObject as any).fakeField;

    const fetchEntity = { entity: UserProfile, id: user.profileId };

    let res = await testMethod({ url: '/crud/one', method: 'PATCH', app, jwt, entityManager, payload, query, expectedCode: 200, fetchEntity, expectedObject, crudConfig });
    expect(res.userName).toEqual('John Green');
    expect(res.fakeField).toBeUndefined();
    expect(res.favoriteColor).toEqual("red");
  });

});