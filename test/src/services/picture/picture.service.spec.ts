import { MongoDriver } from '@mikro-orm/mongodb';
import { Test, TestingModule } from '@nestjs/testing';
import { PictureService } from './picture.service';
import { EICRUDModule } from '@eicrud/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import Picture from './picture.entity';
import { MyConfigService } from '../../eicrud.config.service';
import { CRUD_CONFIG_KEY } from '@eicrud/core/config';

describe('AppController', () => {
  let myService: PictureService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        MikroOrmModule.forRoot({
          entities: [Picture],
          driver: MongoDriver,
          dbName: 'test-picture',
        }),
        EICRUDModule.forRoot(),
      ],
      providers: [
        PictureService,
        {
          provide: CRUD_CONFIG_KEY,
          useClass: MyConfigService,
        },
      ],
    }).compile();

    myService = app.get<PictureService>(PictureService);
  });

  describe('root', () => {
    it('should be defined"', () => {
      expect(myService).toBeDefined();
    });
  });
});
