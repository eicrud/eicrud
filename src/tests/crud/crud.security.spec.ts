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

  const usersForDeletion: Record<string, TestUser> = {
    "Michael Delete": {
      email: "michael.delete@test.com",
      role: "user",
      bio: 'I am a bad guy.',
    },
    "Joe Deletedbyadmin": {
      email: "Joe.Deletedbyadmin@test.com",
      role: "user",
      bio: 'I am a bad guy.',
    },
  };

  const usersForManyDeletion: Record<string, TestUser> = {
    "Michael DeleteMany": {
      email: "michael.DeleteMany@test.com",
      role: "user",
      bio: 'BIO_DELETE_KEY',
    },
    "Joe DeleteMany": {
      email: "Joe.DeleteMany@test.com",
      role: "user",
      bio: 'BIO_DELETE_KEY',
    },
  };



  const usersForInDeletion: Record<string, TestUser> = {
    "Michael DeleteIn": {
      email: "michael.DeleteIn@test.com",
      role: "user",
      bio: 'In delete guy.',
    },
    "Joe DeleteIn": {
      email: "Joe.DeleteIn@test.com",
      role: "user",
      bio: 'In delete guy 2.',
    },
  };


  const users: Record<string, TestUser> = {

    "Michael Doe": {
      email: "michael.doe@test.com",
      role: "user",
      bio: 'I am a cool guy.',
    },
    "Sarah Doe": {
      email: "sarah.doe@test.com",
      role: "user",
      bio: 'I am a cool girl.',
      melons: 5
    },
    "John NoProfile": {
      email: "john.noprofile@mail.com",
      role: "user",
      bio: 'I am a cool guy.',
      skipProfile: true
    },
    "Hack NoProfile": {
      email: "hack.noprofile@mail.com",
      role: "user",
      bio: 'I am a cool guy.',
      skipProfile: true
    },
    "Greed NoProfile": {
      email: "greed.noprofile@mail.com",
      role: "user",
      bio: 'I am a cool guy.',
      skipProfile: true
    },
    "Trusted NoProfile": {
      email: "trustedgreed.noprofile@mail.com",
      role: "trusted_user",
      bio: 'I am a cool guy.',
      skipProfile: true
    },
    "Moderator Joe": {
      email: "moderator.joe@mail.com",
      role: "moderator",
      bio: 'I am a discord mod.',
      profileType: "admin",
    },
    "Moderator Bro": {
      email: "moderator.bro@mail.com",
      role: "moderator",
      bio: 'I am a reddit mod.',
      profileType: "admin",
    },
    "Admin Dude": {
      email: "admin.dude@mail.com",
      role: "admin",
      bio: 'I am a sys admin.',
      profileType: "admin",
    }
  }

  beforeAll(async () => {

    const moduleRef: TestingModule = await Test.createTestingModule(
      getModule('test-security-db')
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
    await createAccountsAndProfiles(usersForDeletion, em, userService, crudConfig, { testAdminCreds });
    await createAccountsAndProfiles(usersForManyDeletion, em, userService, crudConfig, { testAdminCreds });
    await createAccountsAndProfiles(usersForInDeletion, em, userService, crudConfig, { testAdminCreds });


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
  it('should authorize create profile when user is own id', async () => {
    const userName = "John NoProfile";
    const user: TestUser = users[userName];
    const payload: Partial<UserProfile> = {
      userName,
      user: user.id,
      bio: user.bio,
      address: '1234 Main St.', // This should be removed
      type: 'basic'
    } as any;
    const query: CrudQuery = {
      service: 'user-profile'
    }
    await createNewProfileTest(app, user.jwt, entityManager, payload, query, crudConfig);
  });

  //@Post('/crud/one')
  it('should forbid create a profile with forbidden field (type)', async () => {
    const userName = "John NoProfile";
    const user: TestUser = users[userName];
    const payload: Partial<UserProfile> = {
      userName,
      user: user.id,
      bio: user.bio,
      type: 'admin' // Forbidden type
    } as any;
    const query: CrudQuery = {
      service: 'user-profile'
    }
    await createNewProfileTest(app, user.jwt, entityManager, payload, query, crudConfig, 403);
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
    await createNewProfileTest(app, user.jwt, entityManager, payload, query, crudConfig);
  });

  it('should forbid create a profile when user is other user', async () => {
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
    const res = await testMethod({ crudConfig, url: '/crud/one', method: 'POST', expectedCode: 403, app, jwt: user.jwt, entityManager, payload, query });
    let resDb = await entityManager.fork().findOne(UserProfile, { bio: bio_key }) as UserProfile;
    expect(resDb).toBeNull();
  });

  it('should forbid create profile when other id with herited right', async () => {
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
    const res = await testMethod({ crudConfig, url: '/crud/one', method: 'POST', expectedCode: 403, app, jwt: user.jwt, entityManager, payload, query });
    let resDb = await entityManager.fork().findOne(UserProfile, { bio: bio_key }) as UserProfile;
    expect(resDb).toBeNull();
  });

  //@Post('/crud/batch')
  it('should authorize batch create melon (own id)', async () => {
    const userName = "Trusted NoProfile";
    const user: TestUser = users[userName];
    const query: CrudQuery = {
      service: CrudService.getName(Melon)
    }
    const NB_MELONS = 5;
    const payload: any = createMelons(NB_MELONS, user, crudConfig);;

    const res = await testMethod({ crudConfig, url: '/crud/batch', method: 'POST', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 201 });
    expect(res?.length).toEqual(NB_MELONS);
    let i = 0;
    for (const profile in res) {
      const query = { id: userService.createNewId(res[profile].id) }; //Weird that I need to convert to objectId here
      const resDB = await entityManager.fork().findOne(Melon, query as any);
      expect(resDB.price).toEqual(i);
      i++;
    }
  });

  it('should forbid batch create when one melon has forbidden field', async () => {
    const userName = "Trusted NoProfile";
    const user: TestUser = users[userName];
    const query: CrudQuery = {
      service: CrudService.getName(Melon)
    }
    const NB_MELONS = 5;
    const payload: any = createMelons(NB_MELONS, user, crudConfig);;

    payload[2].size = 200;

    const res = await testMethod({ crudConfig, url: '/crud/batch', method: 'POST', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403 });

  });

  it('should forbid batch create when size over maxBatchSize', async () => {
    const userName = "Trusted NoProfile";
    const user: TestUser = users[userName];
    const query: CrudQuery = {
      service: CrudService.getName(Melon)
    }
    const NB_MELONS = 6;
    const payload: any = createMelons(NB_MELONS, user, crudConfig);
    const res = await testMethod({ crudConfig, url: '/crud/batch', method: 'POST', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403 });
  });

  it('should forbid batch create when no maxBatchSize in rights', async () => {
    const userName = "Michael Doe";
    const user: TestUser = users[userName];
    const query: CrudQuery = {
      service: CrudService.getName(Melon)
    }
    const NB_MELONS = 5;
    const payload: any = createMelons(NB_MELONS, user, crudConfig);
    const res = await testMethod({ crudConfig, url: '/crud/batch', method: 'POST', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403 });
  });


  //@Get('/crud/one')
  it('should authorize find one profile by own user', async () => {
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

  it('should authorize moderator find own profile even with limiting key present', async () => {
    const userName = "Moderator Joe";
    const user: TestUser = users[userName];
    const payload: Partial<UserProfile> = {
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ user: formatId(user.id as any, crudConfig), type: 'admin' })
    }
    const expectedObject = {
      bio: user.bio,
    }
    return testMethod({ url: '/crud/one', method: 'GET', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 200, expectedObject, crudConfig });
  });

  it('should forbid moderator find admin type profile', async () => {
    const userName = "Moderator Joe";
    const user: TestUser = users[userName];
    const otherUser: TestUser = users["Moderator Bro"];
    const payload: Partial<UserProfile> = {
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ user: formatId(otherUser.id as any, crudConfig), type: 'admin' })
    }
    const expectedObject = null;
    return testMethod({ url: '/crud/one', method: 'GET', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403, expectedObject, crudConfig });
  });

  it('should forbid find other profile by user', async () => {
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

  it('should authorize find melon from other user', async () => {
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

  it('should forbid find melon for guest', async () => {
    const otherUser: TestUser = users["Sarah Doe"];
    const payload: Partial<Melon> = {
    } as any;
    const query: CrudQuery = {
      service: CrudService.getName(Melon),
      query: JSON.stringify({ owner: formatId(otherUser.id as any, crudConfig) })
    }
    const expectedObject: Partial<Melon> = null;
    return testMethod({ expectedCode: 403, url: '/crud/one', method: 'GET', app, jwt: null, entityManager, payload, query, expectedObject, crudConfig });
  }
  );

  //Get('/crud/many')
  it('should authorize find many profiles by bio', async () => {
    const userName = "Michael Doe";
    const user: TestUser = users[userName];
    const payload: Partial<UserProfile> = {
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ bio: user.bio, user: formatId(user.id as any, crudConfig) })
    }

    const expectedObject = null;

    const res = await testMethod({ url: '/crud/many', method: 'GET', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 200, expectedObject, crudConfig });

    expect(res.length).toEqual(1);
    for (const profile in res) {
      expect(res[profile].bio).toEqual(user.bio);
    }

  });

  it('should forbid find many profiles by bio if limiting key not present', async () => {
    const userName = "Michael Doe";
    const user: TestUser = users[userName];
    const payload: Partial<UserProfile> = {
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ bio: user.bio })
    }

    const expectedObject = null;

    const res = await testMethod({ url: '/crud/many', method: 'GET', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403, expectedObject, crudConfig });

  });

  it('should forbid find many profiles by bio if limiting key is not own id', async () => {
    const userName = "Michael Doe";
    const user: TestUser = users[userName];
    const otherUser: TestUser = users["Sarah Doe"];
    const payload: Partial<UserProfile> = {
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ bio: user.bio, user: formatId(otherUser.id as any, crudConfig) })
    }

    const expectedObject = null;

    const res = await testMethod({ url: '/crud/many', method: 'GET', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403, expectedObject, crudConfig });

  });

  //@Get('/crud/in')
  it('should authorize find in profiles with limiting key', async () => {
    const userName = "Moderator Joe";
    const user: TestUser = users[userName];
    const payload: Partial<UserProfile> = {
    } as any;
    const ids = [];
    for (const key in users) {
      const us = users[key];
      if (!us.skipProfile && (!us.profileType || us.profileType === "basic")) {
        const formatedId = formatId(us.profileId, crudConfig);
        ids.push(formatedId);
      }
    }
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: ids, type: 'basic' })
    }

    const expectedObject = null;

    const res = await testMethod({ url: '/crud/in', method: 'GET', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 200, expectedObject, crudConfig });

    expect(res.length).toEqual(ids.length);
    expect(res[0].userName).toBeDefined();
    expect(res[0].id).toBeDefined();
  });

  it('limited find query should have smaller result', async () => {
    const userName = "Moderator Joe";
    const user: TestUser = users[userName];
    const payload: Partial<UserProfile> = {
    } as any;
    const ids = [];
    for (const key in users) {
      const us = users[key];
      if (!us.skipProfile) {
        const formatedId = formatId(us.profileId, crudConfig);
        ids.push(formatedId);
      }
    }
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: ids, type: 'basic' })
    }

    const expectedObject = null;

    const res = await testMethod({ url: '/crud/in', method: 'GET', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 200, expectedObject, crudConfig });
    expect(res.length).toBeGreaterThan(0);
    expect(res.length).toBeLessThan(ids.length);

  });

  //@Get('/crud/in')
  it('should forbid find in profiles without limiting key', async () => {
    const userName = "Moderator Joe";
    const user: TestUser = users[userName];
    const payload: Partial<UserProfile> = {
    } as any;
    const ids = [];
    for (const key in users) {
      const us = users[key];
      if (!us.skipProfile && (!us.profileType || us.profileType === "basic")) {
        const formatedId = formatId(us.profileId, crudConfig);
        ids.push(formatedId);
      }
    }
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: ids })
    }

    const expectedObject = null;

    const res = await testMethod({ url: '/crud/in', method: 'GET', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403, expectedObject, crudConfig });

  });

  //@Patch('/crud/one')
  it('should authorize patch own profile with limiting key', async () => {
    const userName = "Sarah Doe";
    const user = users[userName];
    const payload: Partial<UserProfile> = {
      userName: 'Sarah Jane',
      fakeField: 'fake',
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: formatId(user.profileId, crudConfig), user: formatId(user.id, crudConfig) })
    }

    const expectedObject = {
      ...payload,
      bio: user.bio,
    }
    delete (expectedObject as any).fakeField;

    const fetchEntity = { entity: UserProfile, id: user.profileId };

    let res = await testMethod({ url: '/crud/one', method: 'PATCH', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 200, fetchEntity, expectedObject, crudConfig });
    expect(res.userName).toBeDefined();
    expect(res.fakeField).toBeUndefined();
  });

  it('should forbid patch own profile without limiting key', async () => {
    const userName = "Sarah Doe";
    const user = users[userName];
    const payload: Partial<UserProfile> = {
      userName: 'Sarah Jane',
      fakeField: 'fake',
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: formatId(user.profileId, crudConfig) })
    }
    const expectedObject = null
    const fetchEntity = null;;

    let res = await testMethod({ url: '/crud/one', method: 'PATCH', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403, fetchEntity, expectedObject, crudConfig });

  });

  it('should forbid moderator patch own profile with forbiden field (type)', async () => {

    const userName = "Moderator Joe";
    const user = users[userName];
    const payload: Partial<UserProfile> = {
      userName: 'Sarah Jane',
      fakeField: 'fake',
      type: 'admin'
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: formatId(user.profileId, crudConfig), user: formatId(user.id, crudConfig) })
    }
    const expectedObject = null
    const fetchEntity = null;;

    let res = await testMethod({ url: '/crud/one', method: 'PATCH', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403, fetchEntity, expectedObject, crudConfig });

  });

  it('should forbid moderator patch own profile with forbiden field (user)', async () => {

    const userName = "Moderator Joe";
    const user = users[userName];
    const otherUser = users["Sarah Doe"];
    const payload: Partial<UserProfile> = {
      userName: 'Sarah Jane',
      fakeField: 'fake',
      user: formatId(otherUser.id, crudConfig)
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: formatId(user.profileId, crudConfig), user: formatId(user.id, crudConfig) })
    }
    const expectedObject = null
    const fetchEntity = null;;

    let res = await testMethod({ url: '/crud/one', method: 'PATCH', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403, fetchEntity, expectedObject, crudConfig });

  });

  //@Patch('/crud/in')
  it('should authorize admin patch in profiles with limiting key', async () => {
    const userName = "Admin Dude";
    const user = users[userName];
    const payload: Partial<UserProfile> = {
      astroSign: 'Cancer',
    };
    const ids = [];
    for (const key in users) {
      const us = users[key];
      if (!us.skipProfile && (!us.profileType || us.profileType === "basic")) {
        const formatedId = formatId(us.profileId, crudConfig);
        ids.push(formatedId);
      }
    }
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: ids, type: 'basic' })
    }

    const expectedObject = null;
    expect(ids.length).toBeGreaterThan(0);

    const res = await testMethod({ url: '/crud/in', method: 'PATCH', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 200, expectedObject, crudConfig });

    expect(res.length).toEqual(ids.length);
    for (const id of ids) {
      const resDB = await entityManager.fork().findOne(UserProfile, { id: userService.createNewId(id) as any });
      expect(resDB.astroSign).toEqual('Cancer');
    }

  });

  it('limited in patch query should have smaller result', async () => {
    const userName = "Admin Dude";
    const user = users[userName];
    const payload: Partial<UserProfile> = {
      astroSign: 'Cancer',
    };
    const ids = [];
    for (const key in users) {
      const us = users[key];
      if (!us.skipProfile) {
        const formatedId = formatId(us.profileId, crudConfig);
        ids.push(formatedId);
      }
    }
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: ids, type: 'basic' })
    }

    const expectedObject = null;
    expect(ids.length).toBeGreaterThan(0);

    const res = await testMethod({ url: '/crud/in', method: 'PATCH', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 200, expectedObject, crudConfig });
    expect(res.length).toBeGreaterThan(0);
    expect(res.length).toBeLessThan(ids.length);

  });

  it('should forbid admin patch in profiles without limiting key', async () => {
    const userName = "Admin Dude";
    const user = users[userName];
    const payload: Partial<UserProfile> = {
      astroSign: 'Cancer',
    };
    const ids = [];
    for (const key in users) {
      const us = users[key];
      if (!us.skipProfile && (!us.profileType || us.profileType === "basic")) {
        const formatedId = formatId(us.profileId, crudConfig);
        ids.push(formatedId);
      }
    }
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: ids })
    }

    const expectedObject = null;
    expect(ids.length).toBeGreaterThan(0);

    const res = await testMethod({ url: '/crud/in', method: 'PATCH', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403, expectedObject, crudConfig });

  });

  it('should forbid moderator patch in profiles with limiting key', async () => {
    const userName = "Moderator Joe";
    const user = users[userName];
    const payload: Partial<UserProfile> = {
      astroSign: 'Cancer',
    };
    const ids = [];
    for (const key in users) {
      const us = users[key];
      if (!us.skipProfile && (!us.profileType || us.profileType === "basic")) {
        const formatedId = formatId(us.profileId, crudConfig);
        ids.push(formatedId);
      }
    }
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: ids, type: 'basic' })
    }

    const expectedObject = null;
    expect(ids.length).toBeGreaterThan(0);

    const res = await testMethod({ url: '/crud/in', method: 'PATCH', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403, expectedObject, crudConfig });


  });

  //@Patch('/crud/batch')
  it('should authorize admin batch patch profiles with limiting key', async () => {

    const userName = "Admin Dude";
    const user = users[userName];

    const query: CrudQuery = {
      service: 'user-profile',
    }

    const payloadArray = [];
    const profilesToPatchBatch = [];
    for (const key in users) {
      const us = users[key];
      if (!us.skipProfile && (!us.profileType || us.profileType === "basic")) {
        const formatedId = formatId(us.profileId, crudConfig);
        profilesToPatchBatch.push({ id: formatedId });
        payloadArray.push({
          query: { id: formatedId, type: 'basic' },
          data: { chineseSign: 'Rat' } as Partial<UserProfile>
        });
      }
    }

    const payload: any = payloadArray;

    const expectedObject = null;

    const res = await testMethod({ url: '/crud/batch', method: 'PATCH', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 200, expectedObject, crudConfig });
    expect(res?.length).toEqual(profilesToPatchBatch.length);
    for (const profileId of profilesToPatchBatch) {
      const resDB = await entityManager.fork().findOne(UserProfile, { id: userService.createNewId(profileId) as any });
      expect(resDB.chineseSign).toEqual('Rat');
    }

  });

  it('should forbid admin batch patch profiles when one have no limiting key', async () => {

    const userName = "Admin Dude";
    const user = users[userName];

    const query: CrudQuery = {
      service: 'user-profile',
    }

    const payloadArray = [];
    const profilesToPatchBatch = [];
    for (const key in users) {
      const us = users[key];
      if (!us.skipProfile && (!us.profileType || us.profileType === "basic")) {
        const formatedId = formatId(us.profileId, crudConfig);
        profilesToPatchBatch.push({ id: formatedId });
        payloadArray.push({
          query: { id: formatedId, type: 'basic' },
          data: { chineseSign: 'Rat' } as Partial<UserProfile>
        });
      }
    }
    delete payloadArray[payloadArray.length - 1].query.type;

    const payload: any = payloadArray;

    const expectedObject = null;

    const res = await testMethod({ url: '/crud/batch', method: 'PATCH', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403, expectedObject, crudConfig });

  });

  it('should forbid moderator batch patch profiles even with limiting key', async () => {

    const userName = "Moderator Joe";
    const user = users[userName];

    const query: CrudQuery = {
      service: 'user-profile',
    }

    const payloadArray = [];
    const profilesToPatchBatch = [];
    for (const key in users) {
      const us = users[key];
      if (!us.skipProfile && (!us.profileType || us.profileType === "basic")) {
        const formatedId = formatId(us.profileId, crudConfig);
        profilesToPatchBatch.push({ id: formatedId });
        payloadArray.push({
          query: { id: formatedId, type: 'basic' },
          data: { chineseSign: 'Rat' } as Partial<UserProfile>
        });
      }
    }

    const payload: any = payloadArray;

    const expectedObject = null;

    const res = await testMethod({ url: '/crud/batch', method: 'PATCH', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403, expectedObject, crudConfig });

  });

  //@Delete('/crud/one')
  it('should authorize delete own profile', async () => {
    const userName = "Michael Delete";
    const user = usersForDeletion[userName];
    const payload: Partial<UserProfile> = {
    } as any;
    const formatedId = formatId(user.profileId, crudConfig);
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: formatedId, user: formatId(user.id, crudConfig) })
    }

    const expectedObject = null;

    const res = await testMethod({ url: '/crud/one', method: 'DELETE', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 200, expectedObject, crudConfig });
    expect(res).toEqual(1);

    const resDb = await entityManager.fork().findOne(UserProfile, { id: user.profileId });
    expect(resDb).toBeNull();

  });

  it('should fail delete other profile limiting key present', async () => {
    const userName = "Michael Delete";
    const user = usersForDeletion[userName];
    const otherUser = users["Sarah Doe"];
    const payload: Partial<UserProfile> = {
    } as any;

    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: formatId(otherUser.profileId, crudConfig), user: formatId(user.id, crudConfig) })
    }

    const expectedObject = null;

    const res = await testMethod({ url: '/crud/one', method: 'DELETE', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 400, expectedObject, crudConfig });

  });

  it('should forbid delete own profile limiting key not present', async () => {
    const userName = "Michael Delete";
    const user = usersForDeletion[userName];
    const payload: Partial<UserProfile> = {
    } as any;
    const formatedId = formatId(user.profileId, crudConfig);
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: formatedId })
    }

    const expectedObject = null;

    const res = await testMethod({ url: '/crud/one', method: 'DELETE', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403, expectedObject, crudConfig });

  });

  it('should authorize admin delete other profile', async () => {
    const userName = "Admin Dude";
    const user = users[userName];
    const delUser = usersForDeletion["Joe Deletedbyadmin"];
    const payload: Partial<UserProfile> = {
    } as any;
    const formatedId = formatId(delUser.profileId, crudConfig);
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: formatedId, type: 'basic' })
    }

    const expectedObject = null;

    const res = await testMethod({ url: '/crud/one', method: 'DELETE', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 200, expectedObject, crudConfig });
    expect(res).toEqual(1);

    const resDb = await entityManager.fork().findOne(UserProfile, { id: delUser.profileId });
    expect(resDb).toBeNull();

  });

  it('should forbid admin delete other profile when not limiting key', async () => {
    const userName = "Admin Dude";
    const user = users[userName];
    const delUser = usersForDeletion["Joe Deletedbyadmin"];
    const payload: Partial<UserProfile> = {
    } as any;
    const formatedId = formatId(delUser.profileId, crudConfig);
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: formatedId })
    }

    const expectedObject = null;

    const res = await testMethod({ url: '/crud/one', method: 'DELETE', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403, expectedObject, crudConfig });

  });


  it('should forbid admin delete moderator profile', async () => {
    const userName = "Admin Dude";
    const user = users[userName];
    const delUser = users["Moderator Joe"];
    const payload: Partial<UserProfile> = {
    } as any;
    const formatedId = formatId(delUser.profileId, crudConfig);
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: formatedId, type: 'admin' })
    }

    const expectedObject = null;

    const res = await testMethod({ url: '/crud/one', method: 'DELETE', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403, expectedObject, crudConfig });


  });

  //@Delete('/crud/in')
  it('should authorize admin delete in profiles', async () => {
    const userName = "Admin Dude";
    const user = users[userName];
    const payload: Partial<UserProfile> = {
    } as any;
    const ids = [];
    for (const key in usersForInDeletion) {
      const formatedId = formatId(usersForInDeletion[key].profileId, crudConfig);
      ids.push(formatedId);
    }
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: ids, type: 'basic' })
    }

    const expectedObject = null;

    for (const profile in usersForInDeletion) {
      const usedel = usersForInDeletion[profile];
      const resDb = await entityManager.fork().findOne(UserProfile, { id: userService.createNewId(usedel.profileId) as any });
      expect(resDb.userName).toBeDefined();
      break;
    }

    const res = await testMethod({ url: '/crud/in', method: 'DELETE', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 200, expectedObject, crudConfig });
    expect(res).toEqual(ids.length);

    for (const profile in usersForInDeletion) {
      const usedel = usersForInDeletion[profile];
      const resDb = await entityManager.fork().findOne(UserProfile, { id: userService.createNewId(usedel.profileId) as any });
      expect(resDb).toBeNull();
    }

  });

  it('should forbid admin delete in profiles when no limiting key', async () => {
    const userName = "Admin Dude";
    const user = users[userName];
    const payload: Partial<UserProfile> = {
    } as any;
    const ids = [];
    for (const key in usersForInDeletion) {
      const formatedId = formatId(usersForInDeletion[key].profileId, crudConfig);
      ids.push(formatedId);
    }
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: ids })
    }

    const expectedObject = null;

    const res = await testMethod({ url: '/crud/in', method: 'DELETE', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403, expectedObject, crudConfig });
  });

  it('should forbid moderator delete in profiles', async () => {
    const userName = "Moderator Bro";
    const user = users[userName];
    const payload: Partial<UserProfile> = {
    } as any;
    const ids = [];
    for (const key in users) {
      const formatedId = formatId(users[key].profileId, crudConfig);
      ids.push(formatedId);
    }
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: ids, type: 'basic' })
    }
    const expectedObject = null;

    const res = await testMethod({ url: '/crud/in', method: 'DELETE', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403, expectedObject, crudConfig });
  });


  it('should forbid admin delete in profiles when wrong limiting key', async () => {
    const userName = "Admin Dude";
    const user = users[userName];
    const payload: Partial<UserProfile> = {
    } as any;
    const ids = [];
    for (const key in users) {
      const formatedId = formatId(users[key].profileId, crudConfig);
      ids.push(formatedId);
    }
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: ids, type: 'admin' })
    }
    const expectedObject = null;

    const res = await testMethod({ url: '/crud/in', method: 'DELETE', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403, expectedObject, crudConfig });
  });

  it('query key should limit in deletion', async () => {
    const userName = "Admin Dude";
    const user = users[userName];
    const payload: Partial<UserProfile> = {
    } as any;
    const ids = [];
    for (const key in users) {
      const formatedId = formatId(users[key].profileId, crudConfig);
      if (formatedId) {
        ids.push(formatedId);
      }
    }
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ id: ids, type: 'basic', bio: "BIO_DONT_EXIST_KEY" })
    }
    const expectedObject = null;

    const res = await testMethod({ url: '/crud/in', method: 'DELETE', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 200, expectedObject, crudConfig });
    expect(res).toEqual(0);
    for (const profile in users) {
      if (!users[profile].skipProfile) {
        const usedel = users[profile];
        const resDb = await entityManager.fork().findOne(UserProfile, { id: userService.createNewId(usedel.profileId) as any });
        expect(resDb.userName).toBeDefined();
        break;
      }
    }
  });

  //@Delete('/crud/many')
  it('should authorize admin delete many profiles', async () => {
    const userName = "Admin Dude";
    const user = users[userName];
    const payload: Partial<UserProfile> = {
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ bio: 'BIO_DELETE_KEY', type: 'basic' })
    }

    const expectedObject = null;

    for (const profile in usersForManyDeletion) {
      const delUser = usersForManyDeletion[profile];
      const resDb = await entityManager.fork().findOne(UserProfile, { id: userService.createNewId(delUser.profileId) as any });
      expect(resDb.userName).toBeDefined();
      break;
    }

    const res = await testMethod({ url: '/crud/many', method: 'DELETE', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 200, expectedObject, crudConfig });
    expect(res).toEqual(Object.keys(usersForManyDeletion).length);

    for (const profile in usersForManyDeletion) {
      const delUser = usersForManyDeletion[profile];
      const resDb = await entityManager.fork().findOne(UserProfile, { id: userService.createNewId(delUser.profileId) as any });
      expect(resDb).toBeNull();
    }

  });

  it('should forbid admin delete many profiles when to limiting key', async () => {
    const userName = "Admin Dude";
    const user = users[userName];
    const payload: Partial<UserProfile> = {
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ bio: 'BIO_DELETE_KEY' })
    }

    const expectedObject = null;


    const res = await testMethod({ url: '/crud/many', method: 'DELETE', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403, expectedObject, crudConfig });


  });


  it('should forbid moderator delete many profiles', async () => {
    const userName = "Moderator Joe";
    const user = users[userName];
    const payload: Partial<UserProfile> = {
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ bio: 'BIO_DELETE_KEY', type: 'basic' })
    }

    const expectedObject = null;


    const res = await testMethod({ url: '/crud/many', method: 'DELETE', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403, expectedObject, crudConfig });


  });

  it('should forbid admin delete many profiles when wrong limiting key', async () => {
    const userName = "Admin Dude";
    const user = users[userName];
    const payload: Partial<UserProfile> = {
    } as any;
    const query: CrudQuery = {
      service: 'user-profile',
      query: JSON.stringify({ bio: 'BIO_DELETE_KEY', type: 'admin' })
    }

    const expectedObject = null;


    const res = await testMethod({ url: '/crud/many', method: 'DELETE', app, jwt: user.jwt, entityManager, payload, query, expectedCode: 403, expectedObject, crudConfig });


  });



});