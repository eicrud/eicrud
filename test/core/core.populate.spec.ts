import { Test, TestingModule } from '@nestjs/testing';

import { getModule, createNestApplication, readyApp, dropDatabases } from '../test.module';
import { CrudController } from '../../core/crud/crud.controller';
import { MyUserService } from '../myuser.service';
import { CrudAuthService } from '../../core/authentification/auth.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { UserProfile } from '../entities/UserProfile';
import { BackdoorQuery, CrudQuery } from '../crud/model/CrudQuery';
import { createAccountsAndProfiles, createMelons, createNewProfileTest, testMethod } from '../test.utils';
import { MyProfileService } from '../profile.service';
import { Melon } from '../entities/Melon';
import { CrudService } from '../../core/crud/crud.service';
import { TestUser } from '../test.utils';
import { CRUD_CONFIG_KEY, CrudConfigService, MicroServiceConfig } from '../../core/crud/crud.config.service';
import { format } from 'path';
import exp from 'constants';
import { MelonService } from '../melon.service';
import axios from 'axios';
import { CrudErrors } from '../../shared/CrudErrors';
import { CrudOptions } from '../../core/crud/model/CrudOptions';

const testAdminCreds = {
  email: "admin@testmail.com",
  password: "testpassword"
}

describe('AppController', () => {
  let appController: CrudController;
  let userService: MyUserService;
  let authService: CrudAuthService;
  let profileService: MyProfileService;
  let melonService: MelonService;
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
    "Trusted NoProfile2": {
      email: "trusted2.noprofile@mail.com",
      role: "trusted_user",
      bio: 'I am a cool guy.',
      skipProfile: true
    },    
    "Trusted NoProfile3": {
      email: "trusted3.noprofile@mail.com",
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
    },
    "Joe Many": {
      email: "Joe.Many@mail.com",
      role: "user",
      bio: 'BIO_FIND_MANY_KEY',
    },
    "Don Many": {
      email: "Don.Many@mail.com",
      role: "user",
      bio: 'BIO_FIND_MANY_KEY',
    },    
    "Moe Many": {
      email: "Moe.Many@mail.com",
      role: "user",
      bio: 'BIO_FIND_MANY_KEY',
    },

  }

  beforeAll(async () => {

    const moduleRef: TestingModule = await Test.createTestingModule(
      getModule(require('path').basename(__filename))
    ).compile();
    await dropDatabases(moduleRef);

    app = createNestApplication(moduleRef)

    await app.init();
    await readyApp(app);

    appController = app.get<CrudController>(CrudController);
    userService = app.get<MyUserService>(MyUserService);
    authService = app.get<CrudAuthService>(CrudAuthService);
    profileService = app.get<MyProfileService>(MyProfileService);
    melonService = app.get<MelonService>(MelonService);
    entityManager = app.get<EntityManager>(EntityManager);
    crudConfig = app.get<CrudConfigService>(CRUD_CONFIG_KEY, { strict: false });

    await createAccountsAndProfiles(users, userService, crudConfig, { testAdminCreds });
    await createAccountsAndProfiles(usersForDeletion, userService, crudConfig, { testAdminCreds });
    await createAccountsAndProfiles(usersForManyDeletion, userService, crudConfig, { testAdminCreds });
    await createAccountsAndProfiles(usersForInDeletion, userService, crudConfig, { testAdminCreds });


  });


  it('should ensure populate is array', async () => {

    const user = users["Admin Dude"];

    const payload = {}

    let query = {
      service: "user-profile",
      query: JSON.stringify({ type: 'basic' }),
      options: JSON.stringify({
        populate: 'pictures'
      }) as any
    }

    await testMethod({ url: '/crud/many', method: 'GET', expectedCode: 400, app, jwt: user.jwt, entityManager, payload, query, crudConfig, returnLimitAndTotal: true});

    query.options = JSON.stringify({
        populate: ['pictures']
      } as CrudOptions);

    await testMethod({ url: '/crud/many', method: 'GET', expectedCode: 200, app, jwt: user.jwt, entityManager, payload, query, crudConfig, returnLimitAndTotal: true});

  });



});