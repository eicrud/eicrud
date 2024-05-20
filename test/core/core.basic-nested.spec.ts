import { Test, TestingModule } from '@nestjs/testing';

import { getModule, createNestApplication, readyApp, dropDatabases } from '../test.module';
import { CrudController } from '../../core/crud/crud.controller';
import { MyUserService } from '../myuser.service';
import { CrudAuthService } from '../../core/authentification/auth.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager, ObjectId} from '@mikro-orm/mongodb';
import { wrap } from '@mikro-orm/core';
import { UserProfile } from '../entities/UserProfile';
import { CrudQuery } from '../../core/crud/model/CrudQuery';
import { createAccountsAndProfiles, createNewProfileTest, testMethod } from '../test.utils';
import { MyProfileService } from '../profile.service';
import { CRUD_CONFIG_KEY, CrudConfigService } from '../../core/crud/crud.config.service';
import { TestUser } from '../test.utils';
import { Picture } from '../entities/Picture';
import { Melon } from '../entities/Melon';

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
  let profiles: Record<string, UserProfile> = {};
  let profilesToRemoveIn: Record<string, UserProfile> = {};
  let profilesToRemoveMany: Record<string, UserProfile> = {};
  let profilesToPatchBatch: Record<string, UserProfile> = {};

  let usersWithoutProfiles: string[] = [];

  let entityManager: EntityManager;

  let crudConfig: CrudConfigService;

  const users: Record<string, TestUser> = {
    "Michael Doe": {
      email: "michael.doe@test.com",
      role: "super_admin",
      bio: 'BIO_FIND_KEY',
      store: profiles,
    },
    "Sarah Doe": {
      email: "sarah.doe@test.com",
      role: "super_admin",
      bio: 'BIO_FIND_KEY',
      store: profiles,
    },
    "Jordan Doe": {
      email: "jordan.doe@test.com",
      role: "super_admin",
      bio: 'BIO_FIND_KEY',
      store: profiles,
    },
    "DelmeIn1 Doe": {
      email: "delme.doe@test.com",
      role: "super_admin",
      bio: 'I am about to be deleted in 1.',
      store: profilesToRemoveIn,
    },
    "DelmeIn2 Doe": {
      email: "delme2.doe@test.com",
      role: "super_admin",
      bio: 'I am about to be deleted in 2.',
      store: profilesToRemoveIn,
    },
    "DelmeMany1 Doe": {
      email: "delmemany.doe@test.com",
      role: "super_admin",
      bio: 'BIO_DELETE_KEY',
      store: profilesToRemoveMany,
    },
    "DelmeMany2 Doe": {
      email: "delmemany2.doe@test.com",
      role: "super_admin",
      bio: 'BIO_DELETE_KEY',
      store: profilesToRemoveMany,
    },
    "PatchmeBatch1 Doe": {
      email: "patchmebatch@mail.com",
      role: "super_admin",
      bio: 'Patch me please.',
      store: profilesToPatchBatch,
    },
    "PatchmeBatch2 Doe": {
      email: "patchmebatch2@mail.com",
      role: "super_admin",
      bio: 'Patch me please 2.',
      store: profilesToPatchBatch,
    },
    "NoProfile1 Doe": {
      email: "noProfileDude1Doe@test.com",
      role: "super_admin",
      bio: 'I have no profile.',
      skipProfile: true,
    },
    "NoProfile2 Doe": {
      email: "noProfileDude2Doe@test.com",
      role: "super_admin",
      bio: 'I have no profile. 2',
      skipProfile: true,
    },
    "Delme Dude": {
      email: "delmedude@mail.com",
      role: "super_admin",
      bio: 'Delete me please.',
    }
  }


  beforeAll(async () => {

    const moduleRef: TestingModule = await Test.createTestingModule(
      getModule(require('path').basename(__filename))
    ).compile();
    await dropDatabases(moduleRef);

    app = createNestApplication(moduleRef)

    await app.init();
    await readyApp(app);

    crudConfig = moduleRef.get<CrudConfigService>(CRUD_CONFIG_KEY, { strict: false });
    appController = app.get<CrudController>(CrudController);
    userService = app.get<MyUserService>(MyUserService);
    authService = app.get<CrudAuthService>(CrudAuthService);
    profileService = app.get<MyProfileService>(MyProfileService);
    entityManager = app.get<EntityManager>(EntityManager);

    await createAccountsAndProfiles(users, userService, crudConfig, { usersWithoutProfiles, testAdminCreds });

    const accRes = await userService.$createAccount(testAdminCreds.email, testAdminCreds.password, null, "super_admin");
    jwt = accRes.accessToken;
    userId = crudConfig.dbAdapter.formatId(accRes.userId, crudConfig);


  }, 10000);



    it('should merge embedded object when patching', async () => {
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
  
        const created = await testMethod({ url: '/crud/one', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

        query.query = JSON.stringify({ id: created.id});
        payload.firstSlice = {
          name: "Replaced",
        }

        const expectedObject = {
          firstSlice: {
            size: 1,
            ...payload.firstSlice,
          },
        }

        const fetchEntity = { entity: Melon, id: created.id };

        const res = await testMethod({ url: '/crud/one', expectedObject, fetchEntity, method: 'PATCH', expectedCode: 200, app, jwt: user.jwt, entityManager, payload, query, crudConfig});


     });

     it('should replace embedded array when patching', async () => {
      const user = users["Michael Doe"];
      const payload: Partial<Melon> = {
        name: "MyMelon",
        price: 1,
        owner: crudConfig.dbAdapter.formatId(user.id, crudConfig),
        ownerEmail: user.email,
        seeds: [
          {
            name: "seed1",
            size: 1,
          },
          {
            name: "seed2",
            size: 1,
          }
        ]
      } as any;

      
      const query: CrudQuery = {
        service: 'melon'
      }

      const created = await testMethod({ url: '/crud/one', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

      query.query = JSON.stringify({ id: created.id});
      payload.seeds = [
        {
          size: 1,
          name: "seed3",
        }
      ]

      const expectedObject = {
        seeds: payload.seeds,
      }

      const fetchEntity = { entity: Melon, id: created.id };

      const res = await testMethod({ url: '/crud/one', expectedObject, fetchEntity, method: 'PATCH', expectedCode: 200, app, jwt: user.jwt, entityManager, payload, query, crudConfig});


   });

   it('should replace basic array when patching', async () => {
    const user = users["Michael Doe"];
    const payload: Partial<Melon> = {
      name: "MyMelon",
      price: 1,
      owner: crudConfig.dbAdapter.formatId(user.id, crudConfig),
      ownerEmail: user.email,
      stringSeeds: ["seed1","seed2"],
    } as any;

    
    const query: CrudQuery = {
      service: 'melon'
    }

    const created = await testMethod({ url: '/crud/one', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

    query.query = JSON.stringify({ id: created.id});
    payload.stringSeeds = ['seed3'];

    const expectedObject = {
      stringSeeds: ['seed3'],
    }

    const fetchEntity = { entity: Melon, id: created.id };

    const res = await testMethod({ url: '/crud/one', expectedObject, fetchEntity, method: 'PATCH', expectedCode: 200, app, jwt: user.jwt, entityManager, payload, query, crudConfig});


    });




  ////@Post('/crud/one')
  // it('should create a new profile with pictures', async () => {
  //   const sarahDoe = users["Sarah Doe"];
  //   const payload: Partial<UserProfile> = {
  //     userName: "John Doe",
  //     user: userId,
  //     bio: 'I am a cool guy.',
  //     pictures: [ { 
  //       profile: sarahDoe.profileId,
  //       id: "5f5e3e3e3e3e3e3e3e3e3e3e",
  //       src: "https://www.google.com",
  //       width: 200,
  //       height: 200,
  //       alt: "A cool picture",
  //       createdAt: new Date(),
  //       updatedAt: new Date()
  //     } as Partial<Picture> ]
  //   } as any;
  //   const query: CrudQuery = {
  //     service: 'user-profile'
  //   }

  //   await createNewProfileTest(app, jwt, entityManager, payload, query, crudConfig);

  // });  

    // //@Patch('/crud/one')
    // it('should patch a profile', async () => {
    //   const sarahDoeProfile = profiles["Sarah Doe"];
    //   const payload: Partial<UserProfile> = {
    //     userName: 'Sarah Jane',
    //     user: crudConfig.dbAdapter.formatId((sarahDoeProfile.user as any).id, crudConfig),
    //     fakeField: 'fake',
    //     pictures: [ { 
    //     id: newPicture.id ,
    //     profile: users["Michael Doe"].profileId,
    //     src: "https://www.google.com",
    //     width: 777,
    //     height: 200,
    //     alt: "A cool picture",
    //     createdAt: new Date(),
    //     updatedAt: new Date()
    //   } as Partial<Picture> ]
    //   } as any;
    //   const formatedId = crudConfig.dbAdapter.formatId(sarahDoeProfile.id, crudConfig);
    //   const query: CrudQuery = {
    //     service: 'user-profile',
    //     query: JSON.stringify({ id: formatedId })
    //   }
  
    //   const expectedObject = {
    //     ...payload,
    //     bio: sarahDoeProfile.bio,
    //   }
    //   delete (expectedObject as any).fakeField;
  
    //   const fetchEntity = { entity: UserProfile, id: sarahDoeProfile.id };
  
    //   let res = await testMethod({ url: '/crud/one', method: 'PATCH', app, jwt, entityManager, payload, query, expectedCode: 200, fetchEntity, expectedObject, crudConfig });
    //   expect(res.userName).toBeDefined();
    //   expect(res.fakeField).toBeUndefined();
    // });
  

});