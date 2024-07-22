import { Test, TestingModule } from '@nestjs/testing';
const path = require('path');
const fs = require('fs');
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
import { EntityManager } from '@mikro-orm/mongodb';
import { UserProfile } from '../src/services/user-profile/user-profile.entity';
import {
  createAccountsAndProfiles,
  createMelons,
  createNewProfileTest,
  testMethod,
} from '../test.utils';
import { UserProfileService as MyProfileService } from '../src/services/user-profile/user-profile.service';
import { SearchDto as SearchCmdDto } from '../src/services/user-profile/cmds/search/search.dto';

import { Melon } from '../src/services/melon/melon.entity';
import { TestUser } from '../test.utils';
import {
  CRUD_CONFIG_KEY,
  CrudConfigService,
} from '@eicrud/core/config/crud.config.service';
import { CrudAuthGuard } from '@eicrud/core/authentication/auth.guard';
import {
  ClientConfig,
  CrudClient,
  MemoryStorage,
} from '../../client/CrudClient';
import { LoginDto } from '@eicrud/core/crud/model/dtos';
import { FindResponseDto } from '../../shared/interfaces';
import { CrudOptions } from '@eicrud/core/crud';
import { SearchDto as SearchMelonDto } from '../src/services/melon/cmds/search/search.dto';
import { SuperClient } from '../test_exports/super_client';
import { DragonFruit } from '../src/services/dragon-fruit/dragon-fruit.entity';
import { SuperclientTest } from '../src/services/superclient-ms/superclient-test/superclient-test.entity';
import {
  PingCmdDto,
  PingCmdReturnDto,
} from '../src/services/superclient-ms/superclient-test/cmds/ping_cmd/ping_cmd.dto';

const testAdminCreds = {
  email: 'admin@testmail.com',
  password: 'testpassword',
};

const users: Record<string, TestUser> = {
  'Michael Doe': {
    email: 'michael.doe@test.com',
    role: 'user',
    bio: 'I am Michael Doe, a cool guy! ',
    melons: 10000,
  },
  'Jon Doe': {
    email: 'jon.doe@test.com',
    role: 'trusted_user',
    bio: 'I am a cool guy.',
    melons: 5,
    dragonfruits: 3,
  },
  'Super Admin Dude': {
    email: 'sadmin.dude@mail.com',
    role: 'super_admin',
    bio: 'I am a sys admin.',
    profileType: 'admin',
  },
  'Moderator Dude': {
    email: 'Moderator.dude@mail.com',
    role: 'moderator',
    bio: 'I am a discord mod.',
  },
  'Moderator Funky': {
    email: 'Moderator.Funky@mail.com',
    role: 'moderator',
    bio: 'I am a discord mod.',
  },
  'Moderator Buddy': {
    email: 'Moderator.Buddy@mail.com',
    role: 'moderator',
    bio: 'I am a discord mod.',
  },
  'Moderator Pal': {
    email: 'Moderator.Pal@mail.com',
    role: 'moderator',
    bio: 'I am a reddit mod.',
  },
  'Melon Many': {
    email: 'melon.many@test.com',
    role: 'user',
    bio: 'I am a cool guy.',
    melons: 7,
  },
};

describe('AppController', () => {
  let appController: CrudController;
  let userService: MyUserService;
  let authService: CrudAuthService;
  let authGuard: CrudAuthGuard;
  let profileService: MyProfileService;
  let app: NestFastifyApplication;

  let entityManager: EntityManager;

  let crudConfig: CrudConfigService;
  const baseName = path.basename(__filename);

  const port = 3003;

  const clientConfig = (): ClientConfig => {
    return {
      url: 'http://127.0.0.1:' + port,
      serviceName: 'user-profile',
      storage: new MemoryStorage(),
      userServiceName: 'my-user',
    } as ClientConfig;
  };

  const getProfileClient = (): CrudClient<UserProfile> =>
    new CrudClient({ ...clientConfig(), serviceName: 'user-profile' });
  const getMelonClient = (): CrudClient<Melon> =>
    new CrudClient({ ...clientConfig(), serviceName: 'melon' });

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
    authGuard = authService._authGuard;
    profileService = app.get<MyProfileService>(MyProfileService);
    entityManager = app.get<EntityManager>(EntityManager);
    crudConfig = app.get<CrudConfigService>(CRUD_CONFIG_KEY, { strict: false });

    crudConfig.authenticationOptions.minTimeBetweenLoginAttempsMs = 0;
    crudConfig.watchTrafficOptions.ddosProtection = false;

    await createAccountsAndProfiles(users, userService, crudConfig, {
      testAdminCreds,
    });

    await app.listen(port);
  });

  it('should check exclusions when exporting superclient', async () => {
    const sharedConfig = clientConfig();
    const sp: SuperClient = new SuperClient(sharedConfig);
    const jonDoe = users['Jon Doe'];

    await sp.myUser.login({ email: jonDoe.email, password: 'testpassword' });

    expect(sp['superclientTestExclude']).toBeUndefined();
    expect(sp['superclientTestExclude2']).toBeUndefined();
    expect(sp['superclientTest']).toBeDefined();

    // comments
    expect(sp['melon']).toBeUndefined();
    const melonCmdDtoPath = path.join(
      'test/test_exports/melon/cmds/search/search.dto.ts',
    );
    expect(fs.existsSync(melonCmdDtoPath)).toBeFalsy();

    const melonFolderPath = path.join('test/test_exports/melon');
    expect(fs.existsSync(melonFolderPath)).toBeFalsy();

    expect(sp['picture']).toBeDefined();
    const pictureCmdDtoPath = path.join(
      'test/src/services/picture/cmds/present_cmd/present_cmd.dto.ts',
    );
    expect(fs.existsSync(pictureCmdDtoPath)).toBeTruthy();

    type expectedDragonFruit = Omit<DragonFruit, 'ownerEmail' | 'size'>;
    // will fail to compile if ownerEmail or size is included
    let resDragonFruit: expectedDragonFruit = await sp.dragonFruit.findOne({
      owner: jonDoe.id,
    });
    console.log(resDragonFruit);
    expect(resDragonFruit['ownerEmail']).toEqual(jonDoe.email);

    type expectedSuperclientTest = Omit<SuperclientTest, 'updatedAt'>;
    let resSuperclientTest: expectedSuperclientTest =
      await sp.superclientTest.create({});
    expect(resSuperclientTest['updatedAt']).toBeDefined();

    type expectedPingCmdDto = Omit<PingCmdDto, 'missingArg'>;
    let dto: expectedPingCmdDto = { myArg: 'hello' };
    let resPingCmd: PingCmdReturnDto;
    let error = null;
    try {
      resPingCmd = await sp.superclientTest.ping_cmd(dto);
    } catch (e) {
      expect(e.response.status).toEqual(403);
      error = e;
    }
    expect(error).toBeDefined();
    resPingCmd = await sp.superclientTest.ping_cmdS(dto);
    expect(resPingCmd).toEqual('ping_cmd');
  });
});
