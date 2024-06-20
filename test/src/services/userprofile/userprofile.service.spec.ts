import { MongoDriver } from '@mikro-orm/mongodb';
import { Test, TestingModule } from '@nestjs/testing';
import { UserProfileService } from './userprofile.service';
import { EICRUDModule } from '@eicrud/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import UserProfile from './userprofile.entity';
import { MyConfigService } from '../../eicrud.config.service';
import { CRUD_CONFIG_KEY } from '@eicrud/core/config';

describe('AppController', () => {
  let myService: UserProfileService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        MikroOrmModule.forRoot({
          entities: [UserProfile],
          driver: MongoDriver,
          dbName: 'test-userprofile',
        }),
        EICRUDModule.forRoot(),
      ],
      providers: [
        UserProfileService,
        {
          provide: CRUD_CONFIG_KEY,
          useClass: MyConfigService,
        },
      ],
    }).compile();

    myService = app.get<UserProfileService>(UserProfileService);
  });

  describe('root', () => {
    it('should be defined"', () => {
      expect(myService).toBeDefined();
    });
  });
});
