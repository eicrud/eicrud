import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { CrudConfigService } from '../core/config/crud.config.service';
import { CrudUserService } from '../core/config/crud-user.service';
import { CrudUser } from '../core/config/model/CrudUser';
import { Picture } from './src/services/picture/picture.entity';

import { create } from 'domain';
import { CrudClient } from '@eicrud/client';
import { DragonFruit } from './src/services/dragonfruit/dragonfruit.entity';
import { Melon } from './src/services/melon/melon.entity';
import { UserProfile } from './src/services/userprofile/userprofile.entity';

export interface TestUser {
  email: string;
  role: string;
  bio: string;
  id?: string;
  profileId?: string;
  profileType?: string;
  jwt?: string;
  skipProfile?: boolean;
  store?: any;
  melons?: number;
  dragonfruits?: number;
  pictures?: number;
  favoriteColor?: string;
  password?: string;
  lowercaseTrimmedField?: string;
}

export function extractAndSetCRSF(raw, myClient: CrudClient<any>) {
  const csrfMatch = parseJwtCookieFromRes(raw, /eicrud-csrf=([^;]*);/);
  expect(csrfMatch).toBeTruthy();
  const csrf = csrfMatch[1];
  myClient.config.globalHeaders = {
    'eicrud-csrf': csrf,
    Cookie: `eicrud-csrf=${csrf}; `,
  };
}

export function parseJwtCookieFromRes(res, regex?) {
  const cookieRegex = regex || /eicrud-jwt=([^;]*);/;
  const cookie = res.headers['set-cookie'];
  for (const c of cookie || []) {
    const match = cookieRegex.exec(c);
    if (match) {
      return match;
    }
  }
}

export function testMethod(arg: {
  app: NestFastifyApplication;
  method: string;
  url: string;
  jwt?: string;
  entityManager: EntityManager;
  payload: any;
  query: any;
  expectedCode: number;
  fetchEntity?: { entity: any; id: string };
  fetchEntities?: { entity: any; query: any };
  expectedObject?: any;
  expectedCrudCode?: number;
  crudConfig: CrudConfigService;
  returnLimitAndTotal?: boolean;
  basicAuth?: { username: string; password: string };
}) {
  const headers = {};
  if (arg.jwt) {
    headers['Cookie'] = `eicrud-jwt=${arg.jwt};`;
  }
  if (arg.basicAuth) {
    headers['Authorization'] =
      `Basic ${Buffer.from(`${arg.basicAuth.username}:${arg.basicAuth.password}`).toString('base64')}`;
  }
  let url = ['/backdoor', '/auth'].some((r) => arg.url.includes(r))
    ? arg.url
    : '/crud/s/' + arg.query.service + arg.url.replace('/crud', '');

  let method = arg.method;
  let payload = arg.payload;
  if (['/auth'].some((r) => arg.url.includes(r))) {
    if (method === 'GET') {
      url = '/crud/s/my-user/cmd/check_jwt';
      method = 'PATCH';
      payload = undefined;
    } else if (method === 'POST') {
      url = '/crud/s/my-user/cmd/login';
    }
  }

  if (arg.query.cmd) {
    url = url + '/' + arg.query.cmd;
  }
  const squery = { ...arg.query };
  delete squery.service;
  delete squery.cmd;
  const query = new URLSearchParams(squery as any).toString();

  return arg.app
    .inject({
      method: method as any,
      url,
      headers,
      payload,
      query,
    })
    .then(async (result) => {
      let total;
      let limit;
      if (result.statusCode !== arg.expectedCode) {
        if (typeof result.payload === 'string') {
          console.log(result.payload);
        } else {
          console.error(result.json());
        }
      }

      expect(result.statusCode).toEqual(arg.expectedCode);
      let res: any = {};

      if (result.payload != '') {
        try {
          res = result.json();
        } catch (e) {
          res = result.payload;
        }
      }

      if (arg.expectedCrudCode) {
        const er = JSON.parse(res.message);
        if (er.code !== arg.expectedCrudCode) console.log(res.message);
        expect(er.code).toEqual(arg.expectedCrudCode);
      }

      if (
        arg.method === 'GET' &&
        (arg.url.includes('many') ||
          arg.url.includes('in') ||
          arg.url.includes('ids'))
      ) {
        ({ total, limit } = res);
        res = res.data;
      }
      if (arg.fetchEntity) {
        let id = arg.fetchEntity.id || res.id;
        id = arg.crudConfig.userService.dbAdapter.checkId(id);
        res = await arg.entityManager
          .fork()
          .findOne(arg.fetchEntity.entity, { id });
        res = JSON.parse(JSON.stringify(res));
      } else if (arg.fetchEntities) {
        res = await arg.entityManager
          .fork()
          .find(arg.fetchEntities.entity, arg.fetchEntities.query);
        res = JSON.parse(JSON.stringify(res));
      }

      if (arg.expectedObject) {
        const arr = Array.isArray(res) ? res : [res];
        expect(arr.length).toBeGreaterThan(0);
        for (const re of arr) {
          for (const key in arg.expectedObject) {
            expect(JSON.stringify(re[key])).toEqual(
              JSON.stringify(arg.expectedObject[key]),
            );
          }
        }
      }
      if (arg.returnLimitAndTotal) {
        return { data: res, total, limit };
      }
      return res;
    });
}

export async function createNewProfileTest(
  app,
  jwt,
  entityManager,
  payload,
  query,
  crudConfig: CrudConfigService,
  expectedCode = 201,
) {
  const res = await testMethod({
    url: '/crud/one',
    method: 'POST',
    expectedCode,
    app,
    jwt: jwt,
    entityManager,
    payload,
    query,
    crudConfig,
  });
  if (expectedCode !== 201) {
    return;
  }
  let resDb = (await entityManager
    .fork()
    .findOne(UserProfile, { id: res[crudConfig.id_field] })) as UserProfile;
  resDb = JSON.parse(JSON.stringify(res));

  expect(res.userName).toEqual(payload.userName);
  expect(resDb.userName).toEqual(payload.userName);
  return res;
}

export function createMelons(
  NB_MELONS,
  owner: TestUser,
  crudConfig: CrudConfigService,
) {
  const payloadArray = [];
  for (let i = 0; i < NB_MELONS; i++) {
    const newMelon: Partial<Melon> = {
      name: `Melon ${i}`,
      owner: owner[crudConfig.id_field],
      price: i,
      ownerEmail: owner.email,
    };
    payloadArray.push(newMelon);
  }
  return payloadArray;
}

export function createDragonFruits(
  NB_DF,
  owner: TestUser,
  crudConfig: CrudConfigService,
) {
  const payloadArray = [];
  for (let i = 0; i < NB_DF; i++) {
    const newMelon: Partial<DragonFruit> = {
      name: `DragonFruit ${i}`,
      owner: owner[crudConfig.id_field],
      ownerEmail: owner.email,
      secretCode: `secret${i}`,
    };
    payloadArray.push(newMelon);
  }
  return payloadArray;
}

export function createPictures(
  NB_PICTURES,
  owner: TestUser,
  crudConfig: CrudConfigService,
) {
  const payloadArray = [];
  for (let i = 0; i < NB_PICTURES; i++) {
    const newPic: Partial<Picture> = {
      profile: owner.profileId,
      width: i,
      height: i,
      src: `https://example.com/${i}`,
      alt: `Alt ${i}`,
    };
    payloadArray.push(newPic);
  }
  return payloadArray;
}

export async function createAccountsAndProfiles(
  users: Record<string, TestUser>,
  userService: CrudUserService<CrudUser>,
  crudConfig: CrudConfigService,
  config: {
    usersWithoutProfiles?: string[];
    testAdminCreds: { email?: string; password: string };
  },
) {
  const em = crudConfig.entityManager.fork();

  const promises = [];
  for (const key in users) {
    const user = users[key];
    const createAccountDto = {
      email: user.email,
      password: user.password || config.testAdminCreds.password,
      role: user.role,
      logMeIn: true,
    };
    const prom = userService
      .$create_account(createAccountDto, null)
      .then((accRes) => {
        users[key][crudConfig.id_field] = userService.dbAdapter.createNewId(
          accRes.userId,
        );
        users[key].jwt = accRes.accessToken;
        if (!user.skipProfile) {
          const newObj = {
            id: userService.dbAdapter.createNewId() as any,
            userName: key,
            user: users[key][crudConfig.id_field],
            bio: user.bio,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          if (user.lowercaseTrimmedField) {
            newObj['lowercaseTrimmedField'] = user.lowercaseTrimmedField;
          }
          if (user.profileType) {
            newObj['type'] = user.profileType;
          }
          if (user.favoriteColor) {
            newObj['favoriteColor'] = user.favoriteColor;
          }
          const newProfile = em.create(UserProfile, newObj);
          if (user.store) {
            user.store[key] = newProfile;
          }
          em.persist(newProfile);
          users[key].profileId = newProfile[crudConfig.id_field];
        } else {
          config.usersWithoutProfiles?.push(users[key][crudConfig.id_field]);
        }

        createEntities(
          em,
          user,
          user.melons,
          Melon,
          createMelons,
          crudConfig,
          userService,
        );
        createEntities(
          em,
          user,
          user.dragonfruits,
          DragonFruit,
          createDragonFruits,
          crudConfig,
          userService,
        );
        createEntities(
          em,
          user,
          user.pictures,
          Picture,
          createPictures,
          crudConfig,
          userService,
        );

        return em.flush();
      });
    promises.push(prom);
  }
  await Promise.all(promises);

  if (process.env.TEST_CRUD_DB == 'postgre') {
    // Is there some propagation delay with postgres? some tests fail without this
    await new Promise((r) => setTimeout(r, 50));
  }
}

function createEntities(em, user, nb, Entity, method, crudConfig, userService) {
  if (nb) {
    const entities = method(nb, user, crudConfig);
    for (const entity of entities) {
      entity.id = userService.dbAdapter.createNewId() as any;
      entity.createdAt = new Date();
      entity.updatedAt = new Date();
      const newEntity = em.create(Entity, entity);
      em.persist(newEntity);
    }
  }
}
