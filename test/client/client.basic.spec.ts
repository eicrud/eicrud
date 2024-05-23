import { Test, TestingModule } from '@nestjs/testing';

import { getModule, createNestApplication, readyApp, dropDatabases } from '../test.module';
import { CrudController } from '../../core/crud/crud.controller';
import { MyUserService } from '../myuser.service';
import { CrudAuthService } from '../../core/authentification/auth.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { UserProfile } from '../entities/UserProfile';
import { CrudQuery } from '../../shared/CrudQuery';
import { createAccountsAndProfiles, createMelons, createNewProfileTest,  testMethod } from '../test.utils';
import { MyProfileService } from '../profile.service';
import { Melon } from '../entities/Melon';
import { CrudService } from '../../core/crud/crud.service';
import { TestUser } from '../test.utils';
import { CRUD_CONFIG_KEY, CrudConfigService } from '../../core/crud/crud.config.service';
import { format } from 'path';
import exp from 'constants';
import { CrudAuthGuard } from '../../core/authentification/auth.guard';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import { ClientOptions, CrudClient, MemoryStorage } from '../../client/CrudClient';
import { LoginDto, LoginResponseDto } from '../../shared/dtos';
import { Module } from '@nestjs/common';

const testAdminCreds = {
  email: "admin@testmail.com",
  password: "testpassword"
}


const users: Record<string, TestUser> = {

  "Michael Doe": {
    email: "michael.doe@test.com",
    role: "user",
    bio: 'I am Michael Doe, a cool guy! ',
    melons: 10000
  },    
  "Jon Doe": {
    email: "jon.doe@test.com",
    role: "user",
    bio: 'I am a cool guy.',
    melons: 5
  },
  "Admin Dude": {
    email: "admin.dude@mail.com",
    role: "admin",
    bio: 'I am a sys admin.',
    profileType: "admin",
  },
  "Melon Many": {
    email: "melon.many@test.com",
    role: "user",
    bio: 'I am a cool guy.',
    melons: 7
  },

}

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


  const clientConfig: ClientOptions = {
    url: 'http://127.0.0.1:3002/' + globalPrefix,
    serviceName: 'user-profile',
    storage: new MemoryStorage()
  }

  const profileClient: CrudClient<UserProfile> = new CrudClient(clientConfig);
  const melonClient: CrudClient<Melon> = new CrudClient({...clientConfig, serviceName: 'melon'});

  beforeAll(async () => {
    const module = getModule(baseName);
    const moduleRef: TestingModule = await Test.createTestingModule(
      module
    ).compile();

    await dropDatabases(moduleRef);

    app = createNestApplication(moduleRef)
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

    await createAccountsAndProfiles(users, userService, crudConfig, { testAdminCreds });

    // @Module(module)
    // class NewTestModule {}

    // const newApp = await NestFactory.create(NewTestModule, new FastifyAdapter());
    // newApp.setGlobalPrefix(globalPrefix);

    await app.listen(3002);    

  });

  it.skip('should find one profile', async () => {
    const user = users["Michael Doe"];
    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password
    }
    await profileClient.login(dto);

    const profile: UserProfile = await profileClient.findOne({ id: user.profileId, user: user.id });

    expect(profile.bio).toBe(user.bio);

  }, 10000);


  it.skip('should disconnect when invalid jwt when getting melon', async () => {
    const user = users["Jon Doe"];
    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password,
      expiresIn: '1s'
    }
    
    await melonClient.login(dto);

    expect(melonClient.storage.get(melonClient.JWT_COOKIE_KEY)).toBeTruthy();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const melon: Melon =await melonClient.findOne({ owner: user.id });

    expect(melon.ownerEmail).toBe(user.email);
    expect(melonClient.storage.get(melonClient.JWT_COOKIE_KEY)).toBeFalsy();


  }, 10000);


  it.skip('should detect limit when fetching melon ids', async () => {

    const user = users["Michael Doe"];
    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password
    }
    await melonClient.login(dto);

    const melons: string[] = (await melonClient.findIds({ owner: user.id })).data;

    expect(melons.length).toBe(10000);
  }, 10000);


  it.skip('should apply limits when fetching melon Id', async () => {

    const account = users["Jon Doe"];
    const user = users["Michael Doe"];
    const dto: LoginDto = {
      email: account.email,
      password: testAdminCreds.password
    }
    await melonClient.login(dto);

    const melons: any = (await melonClient.findIds({ owner: user.id }, { limit: 500 }));

    expect(melons.data.length).toBe(500);
    expect(melons.total).toBe(10000);
  }, 10000);


  it.skip('should find melons in ids', async () => {

    const user = users["Michael Doe"];
    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password
    }
    await melonClient.login(dto);

    const ids: string[] = (await melonClient.findIds({ owner: user.id })).data;

    const melons: Melon[] = (await melonClient.findIn(ids)).data;

    expect(melons.length).toBe(10000);
    let prev = "";
    for(let i = 0; i < melons.length; i++) {
      expect(melons[i].owner).toBe(user.id?.toString());
      expect(melons[i].name).not.toBe(prev);
      prev = melons[i].name;
    }


  },7000);


  //@Patch('one')
  it.skip('should patch one profile', async () => {
    const user = users["Jon Doe"];
    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password
    }
    await profileClient.login(dto);

    const patch: Partial<UserProfile> = {
      astroSign: "Aries"
    }

    await profileClient.patchOne({ id: user.profileId, user: user.id }, patch);

    const profile: UserProfile = await profileClient.findOne({ id: user.profileId, user: user.id });

    expect(profile.astroSign).toBe(patch.astroSign);

  });

  //@Patch('many')
  it('should find & patch many melons', async () => {
    const user = users["Melon Many"];
    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password
    }
    await profileClient.login(dto);

    const melons: Melon[] = (await melonClient.find({ owner: user.id })).data;

    expect(melons.length).toBe(user.melons);

    expect(melons[0].size).toBe(1);

    const patch: Partial<Melon> = {
      size: 136,
    }

    await melonClient.patchMany({ owner: user.id }, patch);

    const updatedMelons: Melon[] = (await melonClient.find({ owner: user.id })).data;

    expect(updatedMelons.length).toBe(user.melons);
    for(let mel of updatedMelons) {
      expect(mel.size).toBe(patch.size);
    }

  });



});