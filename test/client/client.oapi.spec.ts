import { Test, TestingModule } from '@nestjs/testing';
import {
  getModule,
  createNestApplication,
  readyApp,
  dropDatabases,
} from '../src/app.module';
import { CrudController } from '@eicrud/core/crud/crud.controller';
import { MyUserService } from '../src/services/my-user/my-user.service';
import { CrudAuthService } from '@eicrud/core/authentication/auth.service';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager } from '@mikro-orm/core';
import { createAccountsAndProfiles } from '../test.utils';
import { TestUser } from '../test.utils';
import {
  CRUD_CONFIG_KEY,
  CrudConfigService,
} from '@eicrud/core/config/crud.config.service';
import * as services from '../oapi-client/services.gen';
import { StarFruit } from '../src/services/star-fruit/star-fruit.entity';
import { StarFruitService } from '../src/services/star-fruit/star-fruit.service';
const path = require('path');

const testAdminCreds = {
  email: 'admin@testmail.com',
  password: 'testpassword',
};

const users: Record<string, TestUser> = {
  'Jon Doe': {
    email: 'jon.doe@test.com',
    role: 'super_admin',
    bio: 'I am a cool guy.',
  },
  'Sarah Doe': {
    email: 'Sarah.doe@test.com',
    role: 'super_admin',
    bio: 'I am a cool gal.',
  },
  'Mark Doe': {
    email: 'Mark.doe@test.com',
    role: 'super_admin',
    bio: 'I am a cool guy.',
  },
  'Johnny Doe': {
    email: 'Johnny.doe@test.com',
    role: 'super_admin',
    bio: 'I am a cool guy.',
    skipProfile: true,
  },
};

describe('AppController', () => {
  let appController: CrudController;
  let userService: MyUserService;
  let authService: CrudAuthService;
  let starFruitService: StarFruitService;
  let app: NestFastifyApplication;

  let entityManager: EntityManager;

  let crudConfig: CrudConfigService;
  const baseName = path.basename(__filename);

  const port = 2997;

  let createdStarFruitIn: StarFruit[] = [];
  let deleteStarFruitIn: StarFruit[] = [];
  let starFruitUpdateBatch: Partial<StarFruit>[] = [];

  beforeAll(async () => {
    const module = getModule(baseName);
    const moduleRef: TestingModule =
      await Test.createTestingModule(module).compile();

    await dropDatabases(moduleRef);

    app = createNestApplication(moduleRef);

    await app.init();
    await readyApp(app);

    appController = app.get<CrudController>(CrudController);
    userService = app.get<MyUserService>(MyUserService);
    authService = app.get<CrudAuthService>(CrudAuthService);
    starFruitService = app.get<StarFruitService>(StarFruitService);
    entityManager = app.get<EntityManager>(EntityManager);
    crudConfig = app.get<CrudConfigService>(CRUD_CONFIG_KEY, { strict: false });

    crudConfig.authenticationOptions.minTimeBetweenLoginAttempsMs = 0;
    crudConfig.watchTrafficOptions.ddosProtection = false;

    const user = users['Jon Doe'];
    const starFruitUpdateOne: Partial<StarFruit> = {
      name: 'StarFruit Update One',
      ownerEmail: user.email,
      key: 'one',
    };
    await starFruitService.$create(starFruitUpdateOne, null);
    const starFruitUpdateMany: Partial<StarFruit>[] = [
      {
        name: 'StarFruit Update Many 1',
        ownerEmail: user.email,
        key: 'many',
      },
      {
        name: 'StarFruit Update Many 2',
        ownerEmail: user.email,
        key: 'many',
      },
    ];
    await starFruitService.$createBatch(starFruitUpdateMany, null);
    starFruitUpdateBatch = [
      {
        name: 'StarFruit Update Batch 1',
        ownerEmail: user.email,
        key: 'batch',
      },
      {
        name: 'StarFruit Update Batch 2',
        ownerEmail: user.email,
        key: 'batch',
      },
      {
        name: 'StarFruit Update Batch 3',
        ownerEmail: user.email,
        key: 'batch',
      },
    ];
    await starFruitService.$createBatch(starFruitUpdateBatch, null);
    const starFruitUpdateIn: Partial<StarFruit>[] = [
      {
        name: 'StarFruit Update In 1',
        ownerEmail: user.email,
        key: 'in',
      },
      {
        name: 'StarFruit Update In 2',
        ownerEmail: user.email,
        key: 'in',
      },
      {
        name: 'StarFruit Update In 3',
        ownerEmail: user.email,
        key: 'in',
      },
      {
        name: 'StarFruit Update In 4',
        ownerEmail: user.email,
        key: 'in',
      },
    ];
    createdStarFruitIn = await starFruitService.$createBatch(
      starFruitUpdateIn,
      null,
    );

    const starFruitDeleteOne: Partial<StarFruit> = {
      name: 'StarFruit Delete One',
      ownerEmail: user.email,
      key: 'delete one',
    };
    await starFruitService.$create(starFruitDeleteOne, null);
    const starFruitDeleteMany: Partial<StarFruit>[] = [
      {
        name: 'StarFruit Delete Many 1',
        ownerEmail: user.email,
        key: 'delete many',
      },
      {
        name: 'StarFruit Delete Many 2',
        ownerEmail: user.email,
        key: 'delete many',
      },
    ];
    await starFruitService.$createBatch(starFruitDeleteMany, null);

    const starFruitDeleteIn: Partial<StarFruit>[] = [
      {
        name: 'StarFruit Delete In 1',
        ownerEmail: user.email,
        key: 'delete in',
      },
      {
        name: 'StarFruit Delete In 2',
        ownerEmail: user.email,
        key: 'delete in',
      },
      {
        name: 'StarFruit Delete In 3',
        ownerEmail: user.email,
        key: 'delete in',
      },
      {
        name: 'StarFruit Delete In 4',
        ownerEmail: user.email,
        key: 'delete in',
      },
    ];
    deleteStarFruitIn = await starFruitService.$createBatch(
      starFruitDeleteIn,
      null,
    );

    await createAccountsAndProfiles(users, userService, crudConfig, {
      testAdminCreds,
    });

    await app.listen(port);
  });

  services.client.setConfig({
    baseURL: `http://localhost:${port}`,
  });

  it('should run cmds with oapi client', async () => {
    const user = users['Jon Doe'];

    let res = await services.patchCrudSUserProfileCmdTestCmd({
      body: {
        returnMessage: "I'm a guest!",
      },
      query: {
        options: JSON.stringify({
          jwtCookie: true,
        }) as any,
      },
    });
    expect(res.data).toBe("I'M A GUEST!");

    res = await services.patchCrudSMyUserCmdLogin({
      body: {
        email: user.email,
        password: testAdminCreds.password,
      },
    });
    expect(res.data.userId).toEqual(user.id?.toString());

    const authorization = 'Bearer ' + res.data.accessToken;

    res = await services.patchCrudSUserProfileCmdTestCmd({
      body: {
        returnMessage: "I'm a guest!",
      },
      query: {
        options: JSON.stringify({
          jwtCookie: true,
        }) as any,
      },
      headers: {
        authorization: authorization,
      },
    });

    expect(res.error).toBeDefined();
    expect(res.error['statusCode']).toBe(403);
    res = await services.postCrudSUserProfileCmdTestCmd({
      body: {
        returnMessage: 'Hello world!',
      },
      query: {
        options: JSON.stringify({
          jwtCookie: true,
        }) as any,
      },
      headers: {
        authorization: authorization,
      },
    });
    expect(res.data).toBe('HELLO WORLD!');

    res = (await services.getCrudSUserProfileCmdTestCmdGet({
      query: {
        query: JSON.stringify({
          returnMessage: 'Hello world!',
        }) as any,
        options: JSON.stringify({
          jwtCookie: true,
        }) as any,
      },
      headers: {
        authorization: authorization,
      },
    })) as any;
    expect(res.data).toBe('HELLO WORLD!');

    res = (await services.patchCrudSUserProfileCmdSearch({
      body: {
        userNameLike: 'Doe',
      },
      query: {
        options: JSON.stringify({
          jwtCookie: true,
        }) as any,
      },
      headers: {
        authorization: authorization,
      },
    })) as any;
    expect(res.data.data['length']).toBeGreaterThan(1);

    res = (await services.patchCrudSUserProfileCmdSearch({
      body: {
        userNameLike: 'Doe',
      },
      query: {
        options: JSON.stringify({
          limit: 1,
        }) as any,
      },
      headers: {
        authorization: authorization,
      },
    })) as any;
    expect(res.data.data['length']).toBe(1);
  }, 8000);

  it('should run create methods', async () => {
    const user = users['Jon Doe'];

    const authorization = 'Bearer ' + user.jwt;

    let payload: Partial<StarFruit> = {
      name: 'fruit 1',
      ownerEmail: user.email,
    };

    let res = await services.postCrudSStarFruitOne({
      body: payload,
      query: {
        options: JSON.stringify({
          jwtCookie: true,
        }) as any,
      },
      headers: {
        authorization: authorization,
      },
    });
    expect(res.data.name).toBe(payload.name);
    const fruit1 = await starFruitService.$findOne(
      { name: payload.name },
      null,
    );
    expect(fruit1.name).toBe(payload.name);

    let payloadBatch: Partial<StarFruit>[] = [
      {
        name: 'fruit 2',
        ownerEmail: 'batch@mail.com',
      },
      {
        name: 'fruit 3',
        ownerEmail: 'batch@mail.com',
      },
    ];

    let res2 = await services.postCrudSStarFruitBatch({
      body: payloadBatch,
      query: {
        options: JSON.stringify({
          jwtCookie: true,
        }) as any,
      },
      headers: {
        authorization: authorization,
      },
    });
    expect(res2.data.length).toBe(2);
    const fruitsBatch = await starFruitService.$find(
      { ownerEmail: 'batch@mail.com' },
      null,
    );
    expect(fruitsBatch.data.length).toBe(2);
  }, 8000);

  it('should run update methods', async () => {
    const user = users['Jon Doe'];

    const authorization = 'Bearer ' + user.jwt;

    let query: Partial<StarFruit> = {
      key: 'one',
    };

    let payload: Partial<StarFruit> = {
      quality: `updated one`,
    };

    let res = await services.patchCrudSStarFruitOne({
      body: payload,
      query: {
        options: JSON.stringify({
          jwtCookie: true,
        }) as any,
        query: JSON.stringify(query) as any,
      },
      headers: {
        authorization: authorization,
      },
    });
    expect(res.data.count).toBe(1);
    const fruit1 = await starFruitService.$findOne(
      { quality: payload.quality, key: query.key },
      null,
    );
    expect(fruit1.quality).toBe(payload.quality);

    let payloadBatchPayload = starFruitUpdateBatch.map((fruit) => {
      return {
        query: {
          name: fruit.name,
        },
        data: {
          quality: 'updated batch',
        },
      };
    });

    let res2 = await services.patchCrudSStarFruitBatch({
      body: payloadBatchPayload,
      query: {
        options: JSON.stringify({
          jwtCookie: true,
        }) as any,
      },
      headers: {
        authorization: authorization,
      },
    });
    expect(res2.data.length).toBe(starFruitUpdateBatch.length);
    const fruitsBatch = await starFruitService.$find({ key: 'batch' }, null);
    for (let fb of fruitsBatch.data) {
      expect(fb.quality).toBe('updated batch');
    }

    let inIds = createdStarFruitIn.map((fruit) => {
      return fruit.id?.toString();
    });
    let inQuery: Partial<StarFruit> = {
      id: inIds as any,
    };
    let resIn = await services.patchCrudSStarFruitIn({
      body: { quality: 'updated in' },
      query: {
        options: JSON.stringify({
          jwtCookie: true,
        }) as any,
        query: JSON.stringify(inQuery) as any,
      },
      headers: {
        authorization: authorization,
      },
    });
    expect(resIn.data.count).toBe(createdStarFruitIn.length);
    const fruitsIn = await starFruitService.$find({ key: 'in' }, null);
    for (let fi of fruitsIn.data) {
      expect(fi.quality).toBe('updated in');
    }

    const manyQuery: Partial<StarFruit> = {
      key: 'many',
    };
    const manyPayload: Partial<StarFruit> = {
      quality: 'updated many',
    };
    let resMany = await services.patchCrudSStarFruitMany({
      body: manyPayload,
      query: {
        options: JSON.stringify({
          jwtCookie: true,
        }) as any,
        query: JSON.stringify(manyQuery) as any,
      },
      headers: {
        authorization: authorization,
      },
    });
    expect(resMany.data.count).toBe(2);
    const fruitsMany = await starFruitService.$find({ key: 'many' }, null);
    for (let fm of fruitsMany.data) {
      expect(fm.quality).toBe('updated many');
    }
  }, 8000);

  it('should run delete methods', async () => {
    const user = users['Jon Doe'];

    const authorization = 'Bearer ' + user.jwt;

    let query: Partial<StarFruit> = {
      key: 'delete one',
    };

    let toBeDeletedOne = await starFruitService.$findOne(query, null);
    expect(toBeDeletedOne).toBeDefined();

    let res = await services.deleteCrudSStarFruitOne({
      query: {
        options: JSON.stringify({
          jwtCookie: true,
        }) as any,
        query: JSON.stringify(query) as any,
      },
      headers: {
        authorization: authorization,
      },
    });
    expect(res.data.count).toBe(1);
    toBeDeletedOne = await starFruitService.$findOne(query, null);
    expect(toBeDeletedOne).toBeFalsy();

    let inIds = deleteStarFruitIn.map((fruit) => {
      return fruit.id?.toString();
    });
    let inQuery: Partial<StarFruit> = {
      id: inIds as any,
    };

    let toBeDeletedIn = await starFruitService.$find({ ...inQuery }, null);
    expect(toBeDeletedIn.data.length).toBeGreaterThan(0);

    let resIn = await services.deleteCrudSStarFruitIn({
      query: {
        options: JSON.stringify({
          jwtCookie: true,
        }) as any,
        query: JSON.stringify(inQuery) as any,
      },
      headers: {
        authorization: authorization,
      },
    });
    expect(resIn.data.count).toBe(createdStarFruitIn.length);
    toBeDeletedIn = await starFruitService.$find(inQuery, null);
    expect(toBeDeletedIn.data.length).toBe(0);

    const manyQuery: Partial<StarFruit> = {
      key: 'delete many',
    };

    let toBeDeletedMany = await starFruitService.$find(manyQuery, null);
    expect(toBeDeletedMany.data.length).toBe(2);

    let resMany = await services.deleteCrudSStarFruitMany({
      query: {
        options: JSON.stringify({
          jwtCookie: true,
        }) as any,
        query: JSON.stringify(manyQuery) as any,
      },
      headers: {
        authorization: authorization,
      },
    });
    expect(resMany.data.count).toBe(2);

    toBeDeletedMany = await starFruitService.$find(manyQuery, null);
    expect(toBeDeletedMany.data.length).toBe(0);
  }, 8000);

  it('should run find methods', async () => {
    const user = users['Jon Doe'];

    const authorization = 'Bearer ' + user.jwt;

    let query: Partial<StarFruit> = {
      key: 'one',
    };

    let res = await services.getCrudSStarFruitOne({
      query: {
        options: JSON.stringify({
          jwtCookie: true,
        }) as any,
        query: JSON.stringify(query) as any,
      },
      headers: {
        authorization: authorization,
      },
    });
    expect(res.data.name).toBe('StarFruit Update One');

    let inIds = createdStarFruitIn.map((fruit) => {
      return fruit.id?.toString();
    });
    let inQuery: Partial<StarFruit> = {
      id: inIds as any,
    };

    let resIn = await services.getCrudSStarFruitIn({
      query: {
        options: JSON.stringify({
          jwtCookie: true,
        }) as any,
        query: JSON.stringify(inQuery) as any,
      },
      headers: {
        authorization: authorization,
      },
    });
    expect(resIn.data.data.length).toBe(createdStarFruitIn.length);
    for (let i = 0; i < resIn.data.data.length; i++) {
      expect(resIn.data.data[i].name).toBe(createdStarFruitIn[i].name);
    }

    const manyQuery: Partial<StarFruit> = {
      key: 'many',
    };

    let resMany = await services.getCrudSStarFruitMany({
      query: {
        options: JSON.stringify({
          jwtCookie: true,
        }) as any,
        query: JSON.stringify(manyQuery) as any,
      },
      headers: {
        authorization: authorization,
      },
    });
    expect(resMany.data.data.length).toBe(2);
    for (let i = 0; i < resMany.data.data.length; i++) {
      expect(resMany.data.data[i].key).toBe('many');
    }
  }, 8000);
});
