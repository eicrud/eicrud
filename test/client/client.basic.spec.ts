import { Test, TestingModule } from '@nestjs/testing';

import { getModule, createNestApplication, readyApp, dropDatabases } from '../test.module';
import { CrudController } from '../../core/crud/crud.controller';
import { MyUserService } from '../myuser.service';
import { CrudAuthService } from '../../core/authentication/auth.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { UserProfile } from '../entities/UserProfile';
import { createAccountsAndProfiles, createMelons, createNewProfileTest,  testMethod } from '../test.utils';
import { MyProfileService } from '../profile.service';
import { Melon } from '../entities/Melon';
import { CrudService } from '../../core/crud/crud.service';
import { TestUser } from '../test.utils';
import { CRUD_CONFIG_KEY, CrudConfigService } from '../../core/config/crud.config.service';
import { format } from 'path';
import exp from 'constants';
import { CrudAuthGuard } from '../../core/authentication/auth.guard';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import { ClientConfig, ClientOptions, CrudClient, MemoryStorage } from '../../client/CrudClient';
import { Module } from '@nestjs/common';
import { LoginDto } from '../../core/crud/model/dtos';

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


  const clientConfig = () : ClientConfig => {
    return {
      url: 'http://127.0.0.1:3002/' + globalPrefix,
      serviceName: 'user-profile',
      storage: new MemoryStorage()
    }
  }

  const getProfileClient = () : CrudClient<UserProfile>  => new CrudClient({...clientConfig(), serviceName: 'user-profile'})
  const getMelonClient = () : CrudClient<Melon>  => new CrudClient({...clientConfig(), serviceName: 'melon'})

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

    crudConfig.authenticationOptions.minTimeBetweenLoginAttempsMs = 0;

    await createAccountsAndProfiles(users, userService, crudConfig, { testAdminCreds });

    // @Module(module)
    // class NewTestModule {}

    // const newApp = await NestFactory.create(NewTestModule, new FastifyAdapter());
    // newApp.setGlobalPrefix(globalPrefix);

    await app.listen(3002);    

  });

  it('should find one profile', async () => {
    const user = users["Michael Doe"];
    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password
    }
    const myClient = getProfileClient();

    await myClient.login(dto);

    const profile: UserProfile = await myClient.findOne({ id: user.profileId, user: user.id });

    expect(profile.bio).toBe(user.bio);

  });


  it('should disconnect when invalid jwt when getting melon', async () => {
    const user = users["Jon Doe"];
    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password,
      expiresIn: '1s'
    }
    const myClient = getMelonClient();

    await myClient.login(dto);

    expect(myClient.storage.get(myClient.JWT_COOKIE_KEY)).toBeTruthy();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const melon: Melon =await myClient.findOne({ owner: user.id });

    expect(melon.ownerEmail).toBe(user.email);
    expect(myClient.storage.get(myClient.JWT_COOKIE_KEY)).toBeFalsy();


  }, 10000);


  it('should detect limit when fetching melon ids', async () => {

    const user = users["Michael Doe"];
    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password
    }
    const myClient = getMelonClient();

    await myClient.login(dto);

    const melons: string[] = (await myClient.findIds({ owner: user.id })).data;
    expect(melons.length).toBe(10000);

  }, 10000);


  it('should apply limits when fetching melon Id', async () => {

    const account = users["Jon Doe"];
    const user = users["Michael Doe"];
    const dto: LoginDto = {
      email: account.email,
      password: testAdminCreds.password
    }
    const myClient = getMelonClient();

    await myClient.login(dto);

    const melons: any = (await myClient.findIds({ owner: user.id }, { limit: 500 }));

    expect(melons.data.length).toBe(500);
    expect(melons.total).toBe(10000);
  }, 10000);

    //@Patch('many')
  it('should find & patch many melons', async () => {
    const user = users["Melon Many"];
    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password
    }
    const myClient = getMelonClient();

    await myClient.login(dto);

    const melons: Melon[] = (await myClient.find({ owner: user.id })).data;

    expect(melons.length).toBe(user.melons);

    expect(melons[0].price).toBe(0);

    const patch: Partial<Melon> = {
      price: 136,
    }

    await myClient.patchMany({ owner: user.id }, patch);

    const updatedMelons: Melon[] = (await myClient.find({ owner: user.id })).data;

    expect(updatedMelons.length).toBe(user.melons);
    for(let mel of updatedMelons) {
      expect(mel.price).toBe(patch.price);
    }

  });


  it('should findIds & patchIn & findIn melons', async () => {

    const user = users["Michael Doe"];
    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password
    }
    const myClient = getMelonClient();

    await myClient.login(dto);

    const ids: string[] = (await myClient.findIds({ owner: user.id })).data;

    const melons: Melon[] = (await myClient.findIn(ids)).data;

    expect(melons.length).toBe(10000);
    for(let i = 0; i < melons.length; i++) {
      expect(melons[i].owner).toBe(user.id?.toString());
      expect(melons[i].price).toBe(i);
    }

    const patch: Partial<Melon> = {
      price: 982,
    }

    const q = {
      [myClient.id_field]: ids,
      owner: user.id
    }

    await myClient.patchIn(q, patch);

    const updatedMelons: Melon[] = (await myClient.findIn(ids)).data;

    expect(updatedMelons.length).toBe(10000);
    for(let i = 0; i < updatedMelons.length; i++) {
      expect(updatedMelons[i].price).toBe(patch.price);
    }


  }, 15000);

  //@Patch('one')
  it('should patch one profile', async () => {
    const user = users["Jon Doe"];
    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password
    }
    const myClient = getProfileClient();

    await myClient.login(dto);

    const patch: Partial<UserProfile> = {
      astroSign: "Aries"
    }

    await myClient.patchOne({ id: user.profileId, user: user.id }, patch);

    const profile: UserProfile = await myClient.findOne({ id: user.profileId, user: user.id });

    expect(profile.astroSign).toBe(patch.astroSign);

  });


});