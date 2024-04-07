import { Test, TestingModule } from '@nestjs/testing';
import { AccountManagementService } from './account-management.service';

describe('AccountManagementService', () => {
  let service: AccountManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountManagementService],
    }).compile();

    service = module.get<AccountManagementService>(AccountManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
