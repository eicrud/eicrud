import { Test, TestingModule } from '@nestjs/testing';

import { getModule } from '../test.module';
import { CrudController } from '../../crud/crud.controller';
import { MyUserService } from '../myuser.service';
import { CrudAuthService } from '../../authentification/auth.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { UserProfile } from '../entities/UserProfile';
import { CrudQuery } from '../../crud/model/CrudQuery';
import { createNewProfileTest, testMethod } from '../test.utils';
import { MyProfileService } from '../profile.service';

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
  let profilesToRemoveIn: Record<string,UserProfile> = {};
  let profilesToRemoveMany: Record<string,UserProfile> = {};
  let profilesToPatchBatch: Record<string,UserProfile> = {};

  let usersWithoutProfiles: string[] = [];

  let sarahDoeProfile: UserProfile;

  let entityManager: EntityManager;
  let delmeProfile: UserProfile;


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
    profileService = app.get<MyProfileService>(MyProfileService);
    entityManager = app.get<EntityManager>(EntityManager);

    const sarahDoe = await userService.createAccount("sarah.doe@test.com",testAdminCreds.password, null, "super_admin" );
    const michaelDoe = await userService.createAccount("michael.doe@test.com",testAdminCreds.password, null, "super_admin" );
    const jordanDoe = await userService.createAccount("jordan.doe@test.com",testAdminCreds.password, null, "super_admin" );
    const delmeDoe = await userService.createAccount("delme.doe@test.com",testAdminCreds.password, null, "super_admin" );
    
    const delmeIn1Doe = await userService.createAccount("delmeIn1Doe.doe@test.com",testAdminCreds.password, null, "super_admin" );
    const delmeIn2Doe = await userService.createAccount("delmeIn2Doe.doe@test.com",testAdminCreds.password, null, "super_admin" );
    const delmeBatch1Doe = await userService.createAccount("delmeBatch1Doe.doe@test.com",testAdminCreds.password, null, "super_admin" );
    const delmeBatch2Doe = await userService.createAccount("delmeBatch2Doe.doe@test.com",testAdminCreds.password, null, "super_admin" );
    
    const patchmeBatch1Doe = await userService.createAccount("patchmeBatch1Doe.doe@test.com",testAdminCreds.password, null, "super_admin" );
    const patchmeBatch2Doe = await userService.createAccount("patchmeBatch2Doe.doe@test.com",testAdminCreds.password, null, "super_admin" );

    const noProfileDude1Doe = await userService.createAccount("noProfileDude1Doe@test.com",testAdminCreds.password, null, "super_admin" );
    const noProfileDude2Doe = await userService.createAccount("noProfileDude2Doe@test.com",testAdminCreds.password, null, "super_admin" );

    usersWithoutProfiles.push(noProfileDude1Doe.userId);
    usersWithoutProfiles.push(noProfileDude2Doe.userId);

    const em = entityManager.fork();

    const profilesToCreate = [];
    profilesToCreate.push({ store: profiles,  userName: "Michael Doe", user: michaelDoe.userId, bio: 'BIO_FIND_KEY'})
    profilesToCreate.push({ store: profiles, userName: "Jordan Doe", user: jordanDoe.userId, bio: 'BIO_FIND_KEY'})
    profilesToCreate.push({ store: profiles, userName: "Sarah Doe", user: sarahDoe.userId, bio: 'BIO_FIND_KEY'})
    
    profilesToCreate.push({ store: profilesToRemoveIn, userName: "DelmeIn1 Doe", user: delmeIn1Doe.userId, bio: 'I am about to be deleted in 1.'})
    profilesToCreate.push({ store: profilesToRemoveIn, userName: "DelmeIn2 Doe", user: delmeIn2Doe.userId, bio: 'I am about to be deleted in 2.'})

    profilesToCreate.push({ store: profilesToRemoveMany, userName: "DelmeBatch1 Doe", user: delmeBatch1Doe.userId, bio: 'BIO_DELETE_KEY'})
    profilesToCreate.push({ store: profilesToRemoveMany, userName: "DelmeBatch2 Doe", user: delmeBatch2Doe.userId, bio: 'BIO_DELETE_KEY'})
    
    profilesToCreate.push({ store: profilesToPatchBatch, userName: "PatchmeBatch1 Doe", user: patchmeBatch1Doe.userId, bio: 'Patch me please.'})
    profilesToCreate.push({ store: profilesToPatchBatch, userName: "PatchmeBatch2 Doe", user: patchmeBatch2Doe.userId, bio: 'Patch me pretty please.'})

    profilesToCreate.forEach((profile) => {
      const key = profile.userName;
      profile.store[key] = em.create(UserProfile, {
        id: new ObjectId() as any,
        userName: profile.userName,
        user: profile.user,
        bio: profile.bio,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      em.persistAndFlush(profile.store[key]);
    });

    sarahDoeProfile = profiles["Sarah Doe"];

    delmeProfile = em.create(UserProfile, {
      id: new ObjectId() as any,
      userName: "Delme Doe",
      user: delmeDoe.userId,
      bio: "I'm about to be deleted.",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    em.persistAndFlush(delmeProfile);

    const accRes = await userService.createAccount(testAdminCreds.email,testAdminCreds.password, null, "super_admin" );
    jwt = accRes.accessToken;
    userId = accRes.userId?.toString();
    
  });

  //@Post('/crud/one')
  it('should create a new profile', async () => {
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

    await createNewProfileTest(app, jwt, entityManager, payload, query);

  });  

  //@Post('/crud/batch')
  it('should create batch new profiles',async ()  => {
      
    const query: CrudQuery = {
      service: 'user-profile',
    }

    const payloadArray = [];

    let i = 0;
    for(let id of usersWithoutProfiles){
      i++;
      payloadArray.push({
        userName: `Batch Doe ${i}`,
        user: id,
        bio: `I am a batch created ${i}.`
      });
    }

    const payload: any = payloadArray;

    const expectedObject =null;

    const res = await testMethod({ url: '/crud/batch', method: 'POST', app, jwt, entityManager, payload, query, expectedCode: 201, expectedObject });

    expect(res?.length).toEqual(usersWithoutProfiles?.length);
    i = 0;
    for(const profile in res){
      i++;
      const res2 = await profileService.findOne( { id: res[profile].id }, null);
      expect(res2.userName).toEqual(`Batch Doe ${i}`);

      const query = { id: new ObjectId(res[profile].id as string) }; //Weird that I need to convert to objectId here
      const resDB = await entityManager.fork().findOne(UserProfile, query as any);
      expect(resDB.userName).toEqual(`Batch Doe ${i}`);
    }

  });

  //@Get('/crud/one')
  it('should find one profile by user',async ()  => {
    const payload: Partial<UserProfile> = {
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ user: (sarahDoeProfile.user as any).id?.toString() })
    }

    const expectedObject = { 
      bio: sarahDoeProfile.bio,
     }

    return testMethod({ url: '/crud/one', method: 'GET', app, jwt, entityManager, payload, query, expectedCode: 200, expectedObject });

  });

  //Get('/crud/many')
  it('should find many profiles by bio',async ()  => {
    const payload: Partial<UserProfile> = {
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ bio: 'BIO_FIND_KEY' })
    }

    const expectedObject =null;

    const res = await testMethod({ url: '/crud/many', method: 'GET', app, jwt, entityManager, payload, query, expectedCode: 200, expectedObject });

    expect(res.length).toEqual(3);
    for(const profile in res){
      expect(res[profile].bio).toEqual('BIO_FIND_KEY');
    }

  });
  
  //@Get('/crud/in')
  it('should find in profiles',async ()  => {
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
  
  //@Patch('/crud/one')
  it('should patch a profile', async  () => {
    const sarahDoeProfile = profiles["Sarah Doe"];
    const payload: Partial<UserProfile> = {
      userName: 'Sarah Jane',
      user: (sarahDoeProfile.user as any).id?.toString(),
      fakeField: 'fake',
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: (sarahDoeProfile.id as any).toString() })
    }

    const expectedObject = { 
      ...payload,
      bio: sarahDoeProfile.bio,
     }
     delete (expectedObject as any).fakeField;

     const fetchEntity = { entity: UserProfile, id: sarahDoeProfile.id };

    let res = await testMethod({ url: '/crud/one', method: 'PATCH', app, jwt, entityManager, payload, query, expectedCode: 200, fetchEntity, expectedObject });
    expect(res.userName).toBeDefined();
    expect(res.fakeField).toBeUndefined();
  });

  //@Patch('/crud/in')
  it('should patch in profiles',async ()  => {
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
    for(const profile in profiles){
      const resDB = await entityManager.fork().findOne(UserProfile, { id: profiles[profile].id });
      expect(resDB.astroSign).toEqual('Aries');
    }

  });

  //@Patch('/crud/batch')
  it('should patch batch profiles',async ()  => {

    const query: CrudQuery = {
      service: 'user-profile',
    }

    const payloadArray = [];

    for(const key in profilesToPatchBatch){
      payloadArray.push({
        query: { id: profilesToPatchBatch[key].id},
        data: { astroSign: 'Taurus' }
      });
    }

    const payload: any = payloadArray;

    const expectedObject =null;

    const res = await testMethod({ url: '/crud/batch', method: 'PATCH', app, jwt, entityManager, payload, query, expectedCode: 200, expectedObject });

    expect(res?.length).toEqual(2);
    for(const profile in profilesToPatchBatch){
      const resDB = await entityManager.fork().findOne(UserProfile, { id: profilesToPatchBatch[profile].id });
      expect(resDB.astroSign).toEqual('Taurus');
    }

  });

  //@Delete('/crud/one')
  it('should delete profile',async ()  => {
    const payload: Partial<UserProfile> = {
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: (delmeProfile.id as any).toString() })
    }

    const expectedObject = null;

    const res = await testMethod({ url: '/crud/one', method: 'DELETE', app, jwt, entityManager, payload, query, expectedCode: 200, expectedObject });
    expect(res).toEqual(1);

    const resDb = await entityManager.fork().findOne(UserProfile, { id: delmeProfile.id });
    expect(resDb).toBeNull();

  });

  //@Delete('/crud/in')
  it('should delete in profiles',async ()  => {
    const payload: Partial<UserProfile> = {
    } as any;
    const ids = [];
    for(const key in profilesToRemoveIn){
      ids.push((profilesToRemoveIn[key].id as any).toString());
    }
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: ids })
    }

    const expectedObject = null;

    const res = await testMethod({ url: '/crud/in', method: 'DELETE', app, jwt, entityManager, payload, query, expectedCode: 200, expectedObject });
    expect(res).toEqual(ids.length);
    
    for(const profile in profilesToRemoveIn) {
      const resDb = await entityManager.fork().findOne(UserProfile, { id: profilesToRemoveIn[profile].id });
      expect(resDb).toBeNull();
    }

  });

  //@Delete('/crud/many')
  it('should delete many profiles',async ()  => {
    const payload: Partial<UserProfile> = {
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ bio: 'BIO_DELETE_KEY' })
    }

    const expectedObject = null;

    const res = await testMethod({ url: '/crud/many', method: 'DELETE', app, jwt, entityManager, payload, query, expectedCode: 200, expectedObject });
    expect(res).toEqual(2);
    
    for(const profile in profilesToRemoveMany) {
      const resDb = await entityManager.fork().findOne(UserProfile, { id: profilesToRemoveMany[profile].id });
      expect(resDb).toBeNull();
    }

  });
});