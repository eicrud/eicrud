import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { CrudAuthService } from '../core/authentication/auth.service';
import { CrudAuthorizationService } from '../core/crud/crud.authorization.service';
import { CrudService } from '../core/crud/crud.service';
import { CmdSecurity, CrudSecurity } from '../core/config/model/CrudSecurity';
import { MyConfigService } from './eicrud.config.service';
import { ModuleRef } from '@nestjs/core';
import { UserProfile } from './entities/UserProfile';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CrudUser } from '../core/config/model/CrudUser';
import { CrudContext } from '../core/crud/model/CrudContext';
import {
  $MaxSize,
  $ToLowerCase,
  $Transform,
  $Type,
} from '../core/validation/decorators';
import { FindResponseDto } from '../shared/interfaces';

export class SearchCmdDto {
  @IsString()
  @$Transform((v: string) => v.replace(/[.*+?^$}{)(|[\]\\]/g, '\\$&'))
  userNameLike: string;

  @IsOptional()
  @IsString()
  type?: string;
}

const myProfileSecurity = (USER_PROFILE) => {
  return {
    cmdSecurityMap: {
      search: {
        dto: SearchCmdDto,
        rolesRights: {},
        guestCanUseAll: true,
      },
      test_cmd: {} as CmdSecurity,
    },
  } as CrudSecurity;
};

@Injectable()
export class MyProfileService extends CrudService<UserProfile> {
  constructor(protected moduleRef: ModuleRef) {
    const serviceName = CrudService.getName(UserProfile);
    super(moduleRef, UserProfile, myProfileSecurity(serviceName));
  }

  async $search(
    dto: SearchCmdDto,
    ctx: CrudContext,
    inheritance?: any,
  ): Promise<FindResponseDto<UserProfile>> {
    const query: Partial<UserProfile> = {
      userName: new RegExp(dto.userNameLike, 'i') as any,
    };

    if (dto.type) {
      query.type = dto.type as any;
    }

    const fakeCtx: CrudContext = {
      ...ctx,
      query,
      data: null,
      origin: 'crud',
      method: 'GET',
    };

    await this.crudAuthorization.authorize(fakeCtx, this.security);

    return this.$find(query, fakeCtx, inheritance);
  }
}
