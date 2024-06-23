import { Test, TestingModule } from '@nestjs/testing';

import {
  getModule,
  createNestApplication,
  readyApp,
  dropDatabases,
} from '../src/app.module';
import { CrudController } from '@eicrud/core/crud/crud.controller';
import { MyUserService } from '../src/services/myuser/myuser.service';
import { CrudAuthService } from '@eicrud/core/authentication/auth.service';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import UserProfile from '../src/services/userprofile/userprofile.entity';
import { CrudQuery } from '@eicrud/core/crud/model/CrudQuery';
import {
  createAccountsAndProfiles,
  createMelons,
  createNewProfileTest,
  testMethod,
} from '../test.utils';
import { UserProfileService as MyProfileService } from '../src/services/userprofile/userprofile.service';
import TestCmdDto from '../src/services/userprofile/cmds/test_cmd/test_cmd.dto';
import Melon from '../src/services/melon/melon.entity';
import { CrudService } from '@eicrud/core/crud/crud.service';
import { TestUser } from '../test.utils';
import {
  CRUD_CONFIG_KEY,
  CrudConfigService,
} from '@eicrud/core/config/crud.config.service';
import { format } from 'path';
import exp from 'constants';
import Picture from '../src/services/picture/picture.entity';
import { CrudErrors } from '@eicrud/shared/CrudErrors';
import { HookTrigger } from '../src/services/hooktrigger/hooktrigger.entity';
import { HookLogService } from '../src/services/hooklog/hooklog.service';
import { _utils } from '@eicrud/core/utils';
import { HookTriggerService } from '../src/services/hooktrigger/hooktrigger.service';

const testAdminCreds = {
  email: 'admin@testmail.com',
  password: 'testpassword',
};

function subCheckHookLogs(allHooks, check, len) {
  const log = allHooks.find(
    (l) =>
      l.hookPosition == check.pos &&
      l.hookType == check.type &&
      (!len || l.length == len),
  );
  if (!log) {
    console.log('Check:', check);
    console.log('Length:', len);
  }
  expect(log).toBeDefined();
  expect(log.message).toBe(check.expectedMessage);
}

function checkHookLogs(logChecks, allHooks) {
  for (const check of logChecks) {
    subCheckHookLogs(allHooks, check, 0);
    for (let i = 1; i < check.length; i++) {
      subCheckHookLogs(allHooks, check, i);
    }
  }
}

describe('AppController', () => {
  let appController: CrudController;
  let userService: MyUserService;
  let authService: CrudAuthService;
  let profileService: MyProfileService;
  let hookLogService: HookLogService;
  let hookTriggerService: HookTriggerService;
  let app: NestFastifyApplication;

  let entityManager: EntityManager;

  let crudConfig: CrudConfigService;

  let hooksToUpdateBatch: Partial<HookTrigger>[];

  const users: Record<string, TestUser> = {
    'Michael Doe': {
      email: 'michael.doe@test.com',
      role: 'user',
      bio: 'I am a cool guy.',
      melons: 10000,
    },
    'Jon Doe': {
      email: 'jon.doe@test.com',
      role: 'user',
      bio: 'I am a cool guy.',
    },
    'Admin Dude': {
      email: 'admin.dude@mail.com',
      role: 'admin',
      bio: 'I am a sys admin.',
      profileType: 'admin',
      pictures: 10,
    },
    'Super Admin Dude': {
      email: 'superadmin.dude@mail.com',
      role: 'super_admin',
      bio: 'I am a super sys admin.',
    },
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule(
      getModule(require('path').basename(__filename)),
    ).compile();
    await dropDatabases(moduleRef);

    app = createNestApplication(moduleRef);

    await app.init();
    await readyApp(app);

    appController = app.get<CrudController>(CrudController);
    userService = app.get<MyUserService>(MyUserService);
    authService = app.get<CrudAuthService>(CrudAuthService);
    profileService = app.get<MyProfileService>(MyProfileService);
    hookLogService = app.get<HookLogService>(HookLogService);
    hookTriggerService = app.get<HookTriggerService>(HookTriggerService);
    entityManager = app.get<EntityManager>(EntityManager);
    crudConfig = app.get<CrudConfigService>(CRUD_CONFIG_KEY, { strict: false });

    const hookToUpdate: Partial<HookTrigger> = {
      message: 'update me',
    };
    hooksToUpdateBatch = [
      {
        id: crudConfig.dbAdapter.createId(crudConfig),
        message: 'update me batch',
        originalMessage: 'update me batch',
      },
      {
        id: crudConfig.dbAdapter.createId(crudConfig),
        message: 'update me batch 2',
        originalMessage: 'update me batch',
      },
      {
        id: crudConfig.dbAdapter.createId(crudConfig),
        message: 'update me batch 3',
        originalMessage: 'update me batch',
      },
    ];
    const hooksToUpdateMany: Partial<HookTrigger>[] = [
      { message: 'update me many' },
      { message: 'update me many' },
      { message: 'update me many' },
    ];
    await hookTriggerService.$createBatch(
      [hookToUpdate, ...hooksToUpdateMany],
      null,
    );
    hooksToUpdateBatch = await hookTriggerService.$createBatch(
      hooksToUpdateBatch,
      null,
    );

    await createAccountsAndProfiles(users, userService, crudConfig, {
      testAdminCreds,
    });
  });

  it('should call hooks on createOne and findOne', async () => {
    const user = users['Michael Doe'];
    const createMessage = 'Test create message';
    const payload: Partial<HookTrigger> = {
      message: createMessage,
    };
    const query: CrudQuery = {
      service: 'hook-trigger',
    };
    const res = await testMethod({
      url: '/crud/one',
      method: 'POST',
      expectedCode: 201,
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });
    expect(res.message).toBe('replaced in hook');
    const createdTrigger: any = await hookTriggerService.$findOne(
      { originalMessage: 'replace Query with ' + createMessage },
      null,
    );
    expect(createdTrigger.hooked).toBe('read');
    expect(createdTrigger.result.message).toBe(createMessage + ' - hooked');
    const createHookLogs = await hookLogService.$find(
      { message: createMessage },
      null,
    );
    const createHookLogs2 = await hookLogService.$find(
      { message: createMessage + ' - hooked' },
      null,
    );
    const createHookLogs3 = await hookLogService.$find(
      { message: 'replace Query with ' + createMessage },
      null,
    );
    const allHooks = [
      ...createHookLogs.data,
      ...createHookLogs2.data,
      ...createHookLogs3.data,
    ];
    expect(allHooks.length).toBe(6);
    const logCheck = [
      {
        pos: 'before',
        type: 'controller',
        expectedMessage: createMessage,
      },
      {
        pos: 'before',
        type: 'create',
        expectedMessage: createMessage,
      },
      {
        pos: 'after',
        type: 'create',
        expectedMessage: createMessage + ' - hooked',
      },
      {
        pos: 'after',
        type: 'controller',
        expectedMessage: createMessage + ' - hooked',
      },
      {
        pos: 'before',
        type: 'read',
        expectedMessage: 'replace Query with ' + createMessage,
      },
      {
        pos: 'after',
        type: 'read',
        expectedMessage: createMessage,
      },
    ];
    checkHookLogs(logCheck, allHooks);
  }, 8000);

  it('should call hooks on createBatch and find', async () => {
    const user = users['Michael Doe'];
    const createMessage = 'Test create batch message';
    const subPayload: Partial<HookTrigger> = {
      message: createMessage,
    };
    const payload: Partial<HookTrigger>[] = [
      subPayload,
      subPayload,
      subPayload,
    ];
    const query: CrudQuery = {
      service: 'hook-trigger',
    };
    const res = await testMethod({
      url: '/crud/batch',
      method: 'POST',
      expectedCode: 201,
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });
    for (const trig of res) {
      expect(trig.message).toBe('replaced in hook');
    }
    const createdTriggers: any = await hookTriggerService.$find(
      { originalMessage: 'replace Query with ' + createMessage },
      null,
    );
    expect(createdTriggers.hooked).toBe('read');
    expect(createdTriggers.result.data.length).toBe(payload.length);
    for (const createdTrigger of createdTriggers.result.data) {
      expect(createdTrigger.message).toBe(createMessage + ' - hooked');
    }
    const createHookLogs = await hookLogService.$find(
      { message: createMessage },
      null,
    );
    const createHookLogs2 = await hookLogService.$find(
      { message: createMessage + ' - hooked' },
      null,
    );
    const createHookLogs3 = await hookLogService.$find(
      { message: 'replace Query with ' + createMessage },
      null,
    );
    const allHooks = [
      ...createHookLogs.data,
      ...createHookLogs2.data,
      ...createHookLogs3.data,
    ];
    const logCheck = [
      {
        pos: 'before',
        type: 'controller',
        expectedMessage: createMessage,
      },
      {
        pos: 'before',
        type: 'create',
        expectedMessage: createMessage,
        length: payload.length,
      },
      {
        pos: 'after',
        type: 'create',
        expectedMessage: createMessage + ' - hooked',
        length: payload.length,
      },
      {
        pos: 'after',
        type: 'controller',
        expectedMessage: createMessage + ' - hooked',
      },
      {
        pos: 'before',
        type: 'read',
        expectedMessage: 'replace Query with ' + createMessage,
      },
      {
        pos: 'after',
        type: 'read',
        expectedMessage: createMessage,
      },
    ];
    checkHookLogs(logCheck, allHooks);
  }, 8000);

  it('should call hooks on patchOne and findOne', async () => {
    const user = users['Michael Doe'];
    const createMessage = 'Test patch one message';
    const payload: Partial<HookTrigger> = {
      message: createMessage,
    };
    const search: Partial<HookTrigger> = {
      originalMessage: 'update me',
    };
    const query: CrudQuery = {
      service: 'hook-trigger',
      query: JSON.stringify(search),
    };
    const res = await testMethod({
      url: '/crud/one',
      method: 'PATCH',
      expectedCode: 200,
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });
    expect(res.message).toBe('replaced in hook (update)');
    const createdTrigger: any = await hookTriggerService.$findOne(
      { originalMessage: 'replace Query with ' + createMessage },
      null,
    );
    expect(createdTrigger.result.message).toBe(createMessage + ' - hooked');
    const createHookLogs = await hookLogService.$find(
      { message: createMessage },
      null,
    );
    const createHookLogs2 = await hookLogService.$find(
      { message: createMessage + ' - hooked' },
      null,
    );
    const createHookLogs3 = await hookLogService.$find(
      { message: 'replace Query with ' + createMessage },
      null,
    );
    const allHooks = [
      ...createHookLogs.data,
      ...createHookLogs2.data,
      ...createHookLogs3.data,
    ];
    expect(allHooks.length).toBe(6);
    const logCheck = [
      {
        pos: 'before',
        type: 'controller',
        expectedMessage: createMessage,
      },
      {
        pos: 'before',
        type: 'update',
        expectedMessage: createMessage,
      },
      {
        pos: 'after',
        type: 'update',
        expectedMessage: createMessage + ' - hooked',
      },
      {
        pos: 'after',
        type: 'controller',
        expectedMessage: createMessage + ' - hooked',
      },
      {
        pos: 'before',
        type: 'read',
        expectedMessage: 'replace Query with ' + createMessage,
      },
      {
        pos: 'after',
        type: 'read',
        expectedMessage: createMessage,
      },
    ];
    checkHookLogs(logCheck, allHooks);
  }, 8000);

  it('should call hooks on patchBatch and findIn', async () => {
    const user = users['Michael Doe'];
    const createMessage = 'Test patch batch message';

    const payload = [
      {
        query: { originalMessage: 'update me batch' },
        data: { message: createMessage },
      },
      {
        query: { originalMessage: 'update me batch 2' },
        data: { message: createMessage },
      },
      {
        query: { originalMessage: 'update me batch 3' },
        data: { message: createMessage },
      },
    ];
    const query: CrudQuery = {
      service: 'hook-trigger',
    };
    const res = await testMethod({
      url: '/crud/batch',
      method: 'PATCH',
      expectedCode: 200,
      app,
      jwt: user.jwt,
      entityManager,
      payload,
      query,
      crudConfig,
    });
    for (const trig of res) {
      expect(trig).toBe('replaced in hook (update)');
    }
    const createdTriggers: any = await hookTriggerService.$findIn(
      hooksToUpdateBatch.map((h) => h.id.toString()),
      { originalMessage: 'replace Query with ' + createMessage },
      null,
    );
    expect(createdTriggers.hooked).toBe('read');
    expect(createdTriggers.result.data.length).toBe(payload.length);
    for (const createdTrigger of createdTriggers.result.data) {
      expect(createdTrigger.message).toBe(createMessage + ' - hooked');
    }
    const createHookLogs = await hookLogService.$find(
      { message: createMessage },
      null,
    );
    const createHookLogs2 = await hookLogService.$find(
      { message: createMessage + ' - hooked' },
      null,
    );
    const createHookLogs3 = await hookLogService.$find(
      { message: 'replace Query with ' + createMessage },
      null,
    );
    const allHooks = [
      ...createHookLogs.data,
      ...createHookLogs2.data,
      ...createHookLogs3.data,
    ];
    const logCheck = [
      {
        pos: 'before',
        type: 'controller',
        expectedMessage: createMessage,
      },
      {
        pos: 'before',
        type: 'update',
        expectedMessage: createMessage,
        length: payload.length,
      },
      {
        pos: 'after',
        type: 'update',
        expectedMessage: createMessage + ' - hooked',
        length: payload.length,
      },
      {
        pos: 'after',
        type: 'controller',
        expectedMessage: createMessage + ' - hooked',
      },
      {
        pos: 'before',
        type: 'read',
        expectedMessage: 'replace Query with ' + createMessage,
      },
      {
        pos: 'after',
        type: 'read',
        expectedMessage: createMessage,
      },
    ];
    checkHookLogs(logCheck, allHooks);
  }, 8000);
});
