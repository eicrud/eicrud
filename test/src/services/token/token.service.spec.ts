import { MongoDriver } from '@mikro-orm/mongodb';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from './token.service';
import { EICRUDModule } from '@eicrud/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Token } from './token.entity';
import { MyConfigService } from '../../eicrud.config.service';
import { CRUD_CONFIG_KEY } from '@eicrud/core/config';

describe('AppController', () => {
  let myService: TokenService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        MikroOrmModule.forRoot({
          entities: [Token],
          driver: MongoDriver,
          dbName: 'test-token',
        }),
        EICRUDModule.forRoot(),
      ],
      providers: [
        TokenService,
        {
          provide: CRUD_CONFIG_KEY,
          useClass: MyConfigService,
        },
      ],
    }).compile();

    myService = app.get<TokenService>(TokenService);
  });

  describe('root', () => {
    it('should be defined"', () => {
      expect(myService).toBeDefined();
    });
  });
});
