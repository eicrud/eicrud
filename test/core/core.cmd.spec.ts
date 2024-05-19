import { Test, TestingModule } from '@nestjs/testing';

import { getModule } from '../test.module';
import { CrudController } from '../../core/crud/crud.controller';
import { MyUserService } from '../myuser.service';
import { CrudAuthService } from '../../core/authentification/auth.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { UserProfile } from '../entities/UserProfile';
import { CrudQuery } from '../../core/crud/model/CrudQuery';
import { createAccountsAndProfiles, createMelons, createNewProfileTest, testMethod } from '../test.utils';
import { MyProfileService, TestCmdDto } from '../profile.service';
import { Melon } from '../entities/Melon';
import { CrudService } from '../../core/crud/crud.service';
import { TestUser } from '../test.utils';
import { CRUD_CONFIG_KEY, CrudConfigService } from '../../core/crud/crud.config.service';
import { format } from 'path';
import exp from 'constants';


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





  const users: Record<string, TestUser> = {

    "Michael Doe": {
      email: "michael.doe@test.com",
      role: "user",
      bio: 'I am a cool guy.',
      melons: 10000
    },    
    "Jon Doe": {
      email: "jon.doe@test.com",
      role: "user",
      bio: 'I am a cool guy.',
    },
    "Admin Dude": {
      email: "admin.dude@mail.com",
      role: "admin",
      bio: 'I am a sys admin.',
      profileType: "admin",
    },

  }

  beforeAll(async () => {

    const moduleRef: TestingModule = await Test.createTestingModule(
      getModule(require('path').basename(__filename))
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

  });


  it('should only allow cmd with max uses in secure mode', async () => {
    const user = users["Jon Doe"];

    const payload: TestCmdDto = {
      returnMessage: "Hello World"
    }

    const query: CrudQuery = {
      service: "user-profile",
      cmd: "testCmd",
    }

    await testMethod({ url: '/crud/cmd', method: 'PATCH', expectedCode: 403, app, jwt: user.jwt, entityManager, payload, query, crudConfig});
    
    await testMethod({ url: '/crud/cmd', method: 'POST', expectedCode: 201, app, jwt: user.jwt, entityManager, payload, query, crudConfig});

  });


});