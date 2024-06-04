import { Test, TestingModule } from '@nestjs/testing';

import {
  getModule,
  createNestApplication,
  readyApp,
  dropDatabases,
} from '../test.module';
import { CrudController } from '@eicrud/core/crud/crud.controller';
import { MyUserService } from '../myuser.service';
import { CrudAuthService } from '@eicrud/core/authentication/auth.service';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager } from '@mikro-orm/mongodb';
import { UserProfile } from '../entities/UserProfile';
import {
  createAccountsAndProfiles,
  createMelons,
  createNewProfileTest,
  testMethod,
} from '../test.utils';
import { MyProfileService, SearchCmdDto } from '../profile.service';
import { Melon } from '../entities/Melon';
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
import { SearchMelonDto } from '../melon.service';

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
    role: 'user',
    bio: 'I am a cool guy.',
    melons: 5,
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
  const baseName = require('path').basename(__filename);

  const globalPrefix = baseName.replace('.spec.ts', '').replaceAll('.', '-');

  const port = 3003;

  const clientConfig = (): ClientConfig => {
    return {
      url: 'http://127.0.0.1:' + port + '/' + globalPrefix,
      serviceName: 'user-profile',
      storage: new MemoryStorage(),
    };
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
    app.setGlobalPrefix(globalPrefix);

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

    // @Module(module)
    // class NewTestModule {}

    // const newApp = await NestFactory.create(NewTestModule, new FastifyAdapter());
    // newApp.setGlobalPrefix(globalPrefix);

    await app.listen(port);
  });

  it('should search doe profiles', async () => {
    const user = users['Super Admin Dude'];

    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password,
    };
    const myClient = getProfileClient();

    await myClient.login(dto);

    const searchDto: SearchCmdDto = {
      userNameLike: 'doe',
    };
    const res: FindResponseDto<UserProfile> = await myClient.cmdL(
      'search',
      searchDto,
    );

    const filteredProfiles = Object.keys(users).filter((u) =>
      u.includes('Doe'),
    );
    expect(filteredProfiles.length).toBeGreaterThan(0);
    expect(res.data?.length).toBe(filteredProfiles.length);
  });

  it('should apply find security to search cmd', async () => {
    const user = users['Moderator Dude'];

    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password,
    };
    const myClient = getProfileClient();

    await myClient.login(dto);

    const searchDto: SearchCmdDto = {
      userNameLike: 'doe',
    };
    let error;
    try {
      await myClient.cmdL('search', searchDto);
    } catch (e) {
      error = e.response.status;
    }
    expect(error).toBe(403);

    searchDto.type = 'basic';

    const res: FindResponseDto<UserProfile> = await myClient.cmdL(
      'search',
      searchDto,
    );

    const filteredProfiles = Object.keys(users).filter((u) =>
      u.includes('Doe'),
    );
    expect(filteredProfiles.length).toBeGreaterThan(0);
    expect(res.data?.length).toBe(filteredProfiles.length);
  });

  it('should apply find limit to search cmd', async () => {
    const user = users['Moderator Dude'];

    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password,
    };
    const myClient = getProfileClient();

    await myClient.login(dto);

    const searchDto: SearchCmdDto = {
      userNameLike: 'doe',
    };
    searchDto.type = 'basic';

    const option: CrudOptions = {
      limit: 1,
    };

    const res: FindResponseDto<UserProfile> = await myClient.cmdL(
      'search',
      searchDto,
      option,
    );

    const filteredProfiles = Object.keys(users).filter((u) =>
      u.includes('Doe'),
    );
    expect(filteredProfiles.length).toBeGreaterThan(1);
    expect(res.data?.length).toBe(1);
  });

  it('should auto fetch melon search cmd (limit & batch)', async () => {
    const user = users['Moderator Dude'];

    const michael = users['Michael Doe'];

    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password,
    };
    const myClient = getMelonClient();

    await myClient.login(dto);

    const searchDto: SearchMelonDto = {
      nameLike: 'melon',
      ownerEmail: michael.email,
    };

    const option: CrudOptions = {
      limit: 1,
    };

    const res: FindResponseDto<Melon> = await myClient.cmdL(
      'search',
      searchDto,
      option,
    );

    expect(res.data?.length).toBe(1);

    delete option.limit;

    const res2: FindResponseDto<Melon> = await myClient.cmdL(
      'search',
      searchDto,
      option,
    );

    expect(res2.data?.length).toBe(michael.melons);

    const ids = res2.data?.map((m) => m.id);

    delete searchDto.nameLike;
    searchDto.ids = ids;

    const res3: FindResponseDto<Melon> = await myClient.cmdL(
      'search',
      searchDto,
      option,
    );

    expect(res3.data?.length).toBe(michael.melons);

    for (let i = 0; i < res3.data?.length; i++) {
      expect(res3.data[i].name).toContain(`${i}`);
    }
  }, 15000);

  it('should auto fetch melon search cmd (specified batch)', async () => {
    const user = users['Moderator Pal'];

    const michael = users['Michael Doe'];

    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password,
    };
    const myClient = getMelonClient();
    myClient.config.cmdDefaultBatchMap = {
      search: { batchField: 'ids', batchSize: 2500 },
    };

    await myClient.login(dto);

    const searchDto: SearchMelonDto = {
      nameLike: 'melon',
      ownerEmail: michael.email,
    };

    const option: CrudOptions = {};

    const res2: FindResponseDto<Melon> = await myClient.cmdL(
      'search',
      searchDto,
      option,
    );

    expect(res2.data?.length).toBe(michael.melons);

    const ids = res2.data?.map((m) => m.id);

    delete searchDto.nameLike;
    searchDto.ids = ids;
    myClient.fetchNb = 0;

    const res3: FindResponseDto<Melon> = await myClient.cmdL(
      'search',
      searchDto,
      option,
    );

    const lastFetch = myClient.fetchNb;
    expect(res3.data?.length).toBe(michael.melons);

    for (let i = 0; i < res3.data?.length; i++) {
      expect(res3.data[i].name).toContain(`${i}`);
    }

    myClient.config.cmdDefaultBatchMap = {
      search: { batchField: 'ids', batchSize: 100 },
    };
    myClient.fetchNb = 0;
    const res4: FindResponseDto<Melon> = await myClient.cmdL(
      'search',
      searchDto,
      option,
    );

    expect(myClient.fetchNb).toBeGreaterThan(lastFetch);
    expect(res4.data?.length).toBe(michael.melons);
  }, 15000);
});
