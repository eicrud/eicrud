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
import { UserProfile } from '../src/services/user-profile/user-profile.entity';
import {
  createAccountsAndProfiles,
  createMelons,
  createNewProfileTest,
  parseJwtCookieFromRes,
  testMethod,
} from '../test.utils';
import { UserProfileService as MyProfileService } from '../src/services/user-profile/user-profile.service';
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
} from '@eicrud/client/CrudClient';
import { LoginDto } from '@eicrud/core/config/basecmd_dtos/user/login.dto';
import { MelonService } from '../src/services/melon/melon.service';
import exp from 'constants';
import { MyUser } from '../src/services/my-user/my-user.entity';

const testAdminCreds = {
  email: 'admin@testmail.com',
  password: 'testpassword',
};

const users: Record<string, TestUser> = {
  'Michael Doe': {
    email: 'michael.doe@test.com',
    role: 'user',
    bio: 'I am Michael Doe, a cool guy! ',
    melons: 1000,
  },
  'Jon Doe': {
    email: 'jon.doe@test.com',
    role: 'user',
    bio: 'I am a cool guy.',
    melons: 5,
  },
  'Jon Dae': {
    email: 'jon.Dae@test.com',
    role: 'user',
    bio: 'I am a cool guy.',
    melons: 5,
  },
  'Admin Dude': {
    email: 'admin.dude@mail.com',
    role: 'admin',
    bio: 'I am a sys admin.',
    profileType: 'admin',
  },
  'Melon Many': {
    email: 'melon.many@test.com',
    role: 'user',
    bio: 'I am a cool guy.',
    melons: 7,
  },
  'Giveme Melons': {
    email: 'Giveme.Melons@test.com',
    role: 'trusted_user',
    bio: 'I am a cool guy.',
  },
  'Patchmy Melons': {
    email: 'PatchMy.Melons@test.com',
    role: 'trusted_user',
    bio: 'I am a cool guy.',
    melons: 44,
  },
  'Logme Out': {
    email: 'Logme.Out@test.com',
    role: 'user',
    bio: 'I am leaving.',
  },
  'Renew Me': {
    email: 'Renew.Me@test.com',
    role: 'user',
    bio: 'I am staying.',
  },
};

describe('AppController', () => {
  let appController: CrudController;
  let userService: MyUserService;
  let authService: CrudAuthService;
  let melonService: MelonService;
  let authGuard: CrudAuthGuard;
  let profileService: MyProfileService;
  let app: NestFastifyApplication;

  let entityManager: EntityManager;

  let crudConfig: CrudConfigService;
  const baseName = require('path').basename(__filename);

  const clientConfig = (): ClientConfig => {
    return {
      url: 'http://127.0.0.1:3002',
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
    melonService = app.get<MelonService>(MelonService);

    crudConfig.authenticationOptions.minTimeBetweenLoginAttempsMs = 0;
    crudConfig.watchTrafficOptions.ddosProtection = false;

    await createAccountsAndProfiles(users, userService, crudConfig, {
      testAdminCreds,
    });

    await app.listen(3002);
  });

  //@Patch('many')
  it('should find & patch many melons', async () => {
    const user = users['Melon Many'];
    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password,
    };
    const myClient = getMelonClient();

    await myClient.login(dto);

    const melons: Melon[] = (await myClient.find({ owner: user.id })).data;

    expect(melons.length).toBe(user.melons);

    expect(melons[0].price).toBe(0);

    const patch: Partial<Melon> = {
      price: 136,
    };

    const resPatch = await myClient.patch({ owner: user.id }, patch, {
      returnUpdatedEntities: true,
    });

    expect(resPatch.count).toBe(user.melons);
    expect(resPatch.updated.length).toBe(user.melons);
    expect(user.melons).toBeGreaterThan(0);

    const updatedIdMap = new Map<string, boolean>();
    for (let mel of resPatch.updated) {
      expect(mel.price).toBe(patch.price);
      expect(mel.ownerEmail).toBe(user.email);
      expect(updatedIdMap.has(mel.id)).toBeFalsy();
      updatedIdMap.set(mel.id, true);
    }

    const updatedMelons: Melon[] = (await myClient.find({ owner: user.id }))
      .data;

    expect(updatedMelons.length).toBe(user.melons);

    for (let mel of updatedMelons) {
      expect(mel.price).toBe(patch.price);
    }

    const resDelete = await myClient.delete(
      { owner: user.id },
      {
        returnUpdatedEntities: true,
      },
    );
    expect(resDelete.count).toBe(user.melons);
    expect(user.melons).toBeGreaterThan(0);
    expect(resDelete.deleted.length).toBe(user.melons);

    const deletedIdMap = new Map<string, boolean>();
    for (let mel of resDelete.deleted) {
      expect(mel.price).toBe(patch.price);
      expect(mel.ownerEmail).toBe(user.email);
      expect(deletedIdMap.has(mel.id)).toBeFalsy();
      deletedIdMap.set(mel.id, true);
    }

    const missingMelons: Melon[] = (await myClient.find({ owner: user.id }))
      .data;

    expect(missingMelons.length).toBe(0);
  });

  it('should findIds & patchIn & findIn & deleteIn melons', async () => {
    //wait 200ms
    await new Promise((resolve) => setTimeout(resolve, 200));

    const user = users['Michael Doe'];
    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password,
    };
    const myClient = getMelonClient();

    //wait 600ms
    await new Promise((resolve) => setTimeout(resolve, 600));

    await myClient.login(dto);

    const ids: string[] = (await myClient.findIds({ owner: user.id })).data;

    const melons: Melon[] = (await myClient.findIn(ids)).data;

    expect(melons.length).toBe(1000);
    for (let i = 0; i < melons.length; i++) {
      expect(melons[i].owner).toBe(user.id?.toString());
      expect(melons[i].price).toBe(i);
    }

    const patch: Partial<Melon> = {
      price: 982,
    };

    const q = {
      [myClient.config.id_field]: ids,
      owner: user.id,
    };

    const res = await myClient.patchIn(q, patch, {
      returnUpdatedEntities: true,
    });

    expect(res.updated.length).toBe(1000);
    expect(res.count).toBe(1000);

    const updatedIdMap = new Map<string, boolean>();
    for (let mel of res.updated) {
      expect(mel.price).toBe(patch.price);
      expect(mel.ownerEmail).toBe(user.email);
      expect(updatedIdMap.has(mel.id)).toBeFalsy();
      updatedIdMap.set(mel.id, true);
    }

    for (let i = 0; i < res.updated.length; i++) {
      expect(res.updated[i].price).toBe(patch.price);
    }

    const updatedMelons: Melon[] = (await myClient.findIn(ids)).data;

    expect(updatedMelons.length).toBe(1000);
    for (let i = 0; i < updatedMelons.length; i++) {
      expect(updatedMelons[i].price).toBe(patch.price);
    }

    const res2 = await myClient.deleteIn(q, { returnUpdatedEntities: true });
    expect(res2.count).toBe(1000);
    expect(res2.deleted.length).toBe(1000);

    const deletedIdMap = new Map<string, boolean>();
    for (let mel of res2.deleted) {
      expect(mel.price).toBe(patch.price);
      expect(mel.ownerEmail).toBe(user.email);
      expect(deletedIdMap.has(mel.id)).toBeFalsy();
      deletedIdMap.set(mel.id, true);
    }

    const missingMelons: Melon[] = (await myClient.findIn(ids)).data;
    expect(missingMelons.length).toBe(0);
  }, 15000);

  //@Patch('one')
  it('should patch and delete one profile', async () => {
    const username = 'Jon Doe';
    const user = users[username];
    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password,
    };
    const myClient = getProfileClient();

    //wait 600ms
    await new Promise((resolve) => setTimeout(resolve, 600));
    await myClient.login(dto);

    const patch: Partial<UserProfile> = {
      astroSign: 'Aries',
    };

    const res1 = await myClient.patchOne(
      { id: user.profileId, user: user.id },
      patch,
      { returnUpdatedEntities: true },
    );
    expect(res1.count).toBe(1);
    expect(res1.updated[0].astroSign).toBe(patch.astroSign);
    expect(res1.updated[0].userName).toBe(username);

    const profile: UserProfile = await myClient.findOne({
      id: user.profileId,
      user: user.id,
    });

    expect(profile.astroSign).toBe(patch.astroSign);

    const res2 = await myClient.deleteOne(
      {
        id: user.profileId,
        user: user.id,
      },
      { returnUpdatedEntities: true },
    );

    expect(res2.count).toBe(1);
    expect(res2.deleted[0].astroSign).toBe(patch.astroSign);
    expect(res2.deleted[0].userName).toBe(username);

    const missingProfile: UserProfile = await myClient.findOne({
      id: user.profileId,
      user: user.id,
    });

    expect(missingProfile).toBeFalsy();
  });

  it('should batch patch melons', async () => {
    const user = users['Patchmy Melons'];

    const res0 = await melonService.$find({ owner: user.id }, null);
    const userMelons0 = res0.data;

    const dto: LoginDto = {
      email: user.email,
      password: testAdminCreds.password,
    };
    const myClient = getMelonClient();

    await myClient.login(dto);

    const batch: { query: any; data: any }[] = [];
    for (let i = 0; i < 10; i++) {
      const popped = userMelons0.pop();
      popped.owner = (popped.owner as MyUser).id || popped.owner;
      if (!popped.owner) {
        console.log(popped);
      }
      batch.push({
        query: { id: popped.id, owner: popped.owner },
        data: { name: `patched name ${popped.price}` },
      });
    }

    const resBatch = await myClient.patchBatch(batch, {
      returnUpdatedEntities: true,
    });
    expect(resBatch.length).toBe(10);
    for (let batch of resBatch) {
      expect(batch.count).toBe(1);
      expect(batch.updated.length).toBe(1);
      expect(batch.updated[0].name).toEqual(
        `patched name ${batch.updated[0].price}`,
      );
      expect(batch.updated[0].ownerEmail).toEqual(user.email);
    }

    const batch2: { query: any; data: any }[] = [];
    for (let i = 0; i < 4; i++) {
      const popped = userMelons0.pop();
      popped.owner = (popped.owner as MyUser).id || popped.owner;
      batch2.push({
        query: { id: popped.id, owner: popped.owner },
        data: { name: `patched name ${popped.price}` },
      });
    }

    const resBatch2 = await myClient.patchBatch(batch2, {
      returnUpdatedEntities: true,
    });
    expect(resBatch2.length).toBe(4);
    for (let batch of resBatch2) {
      expect(batch.count).toBe(1);
      expect(batch.updated.length).toBe(1);
      expect(batch.updated[0].name).toEqual(
        `patched name ${batch.updated[0].price}`,
      );
      expect(batch.updated[0].ownerEmail).toEqual(user.email);
    }

    const batch3: Melon[] = [];
    for (let i = 0; i < 20; i++) {
      const popped = userMelons0.pop();
      popped.owner = (popped.owner as MyUser).id || popped.owner;
      batch3.push({
        owner: popped.owner,
        id: popped.id,
        name: `patched name ${popped.price}`,
      } as Melon);
    }

    const resSave = await myClient.saveBatch(
      ['owner'],
      batch3,
      { returnUpdatedEntities: true },
      { batchSize: 4 },
    );
    expect(resSave.length).toBe(20);
    for (let batch of resSave) {
      expect(batch.count).toBe(1);
      expect(batch.updated.length).toBe(1);
      expect(batch.updated[0].name).toEqual(
        `patched name ${batch.updated[0].price}`,
      );
      expect(batch.updated[0].ownerEmail).toEqual(user.email);
    }

    const batch4: Melon[] = [];
    for (let i = 0; i < 10; i++) {
      const popped = userMelons0.pop();
      popped.owner = (popped.owner as MyUser).id || popped.owner;
      batch4.push({
        owner: popped.owner,
        id: popped.id,
        name: `patched name ${popped.price}`,
      } as Melon);
    }
    myClient.config.limitingFields = ['owner'];

    const resSave2 = await myClient.saveBatch(
      null,
      batch4,
      { returnUpdatedEntities: true },
      { batchSize: 4 },
    );

    expect(resSave2.length).toBe(10);
    for (let batch of resSave2) {
      expect(batch.count).toBe(1);
      expect(batch.updated.length).toBe(1);
      expect(batch.updated[0].name).toEqual(
        `patched name ${batch.updated[0].price}`,
      );
      expect(batch.updated[0].ownerEmail).toEqual(user.email);
    }

    const res = await melonService.$find({ owner: user.id }, null);
    const userMelons = res.data;
    expect(userMelons.length).toBe(44);

    for (const mel of userMelons) {
      expect(mel.name).toEqual(`patched name ${mel.price}`);
    }
  });
});
