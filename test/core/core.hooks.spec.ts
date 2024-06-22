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

    await createAccountsAndProfiles(users, userService, crudConfig, {
      testAdminCreds,
    });
  });

  it(
    'should call hooks on createOne and findOne',
    async () => {
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
        { originalMessage: createMessage },
        null,
      );
      expect(createdTrigger.result.message).toBe(createMessage + ' - hooked');
      const createHookLogs = await hookLogService.$find(
        { message: createMessage },
        null,
      );
      expect(createHookLogs.data.length).toBe(2);
    },
    8000 * 100,
  );
});
