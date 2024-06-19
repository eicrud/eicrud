import { ModuleRef } from '@nestjs/core';

import { Melon } from './entities/Melon';
import { MyConfigService } from './eicrud.config.service';
import { Injectable, BadRequestException } from '@nestjs/common';
import { CrudService } from '../core/crud/crud.service';
import { CrudSecurity } from '../core/config/model/CrudSecurity';
import { CrudUser } from '../core/config/model/CrudUser';
import { IsOptional, IsString } from 'class-validator';
import { FindResponseDto } from '../shared/interfaces';
import { UserProfile } from './entities/UserProfile';
import { CrudContext } from '../core/crud/model/CrudContext';
import {
  $MaxLength,
  $MaxSize,
  $Transform,
  $Type,
} from '../core/validation/decorators';
import { CrudErrors } from '../shared/CrudErrors';
export class SearchMelonDto {
  @IsString()
  @IsOptional()
  @$Transform((v: string) => v.replace(/[.*+?^$}{)(|[\]\\]/g, '\\$&'))
  nameLike: string;

  @IsOptional()
  @IsString({ each: true })
  @$MaxSize(-1)
  ids?: string[];

  @IsOptional()
  @IsString()
  ownerEmail?: string;
}
const melonSecurity = (MELON) => {
  return {
    cmdSecurityMap: {
      search: {
        batchField: 'ids',
        dto: SearchMelonDto,
        rolesRights: {
          guest: {
            maxBatchSize: 200,
            async defineCMDAbility(can, cannot, ctx) {
              can('search', MELON);
            },
          },
        },
      },
    },

    rolesRights: {
      super_admin: {
        async defineCRUDAbility(can, cannot, ctx) {
          can('crud', MELON);
        },
      },
      admin: {},
      trusted_user: {
        maxBatchSize: 5,
      },
      user: {
        async defineCRUDAbility(can, cannot, ctx) {
          const user: CrudUser = ctx.user;
          const userId = ctx.userId;
          can('cud', MELON, { owner: userId });
          cannot('cu', MELON, ['size']);
          can('read', MELON);
        },
      },
      guest: {
        async defineCRUDAbility(can, cannot, ctx) {
          can('read', MELON);
        },
      },
    },

    maxItemsPerUser: 10,
    additionalItemsInDbPerTrustPoints: 1,
  } as CrudSecurity;
};
@Injectable()
export class MelonService extends CrudService<Melon> {
  constructor(protected moduleRef: ModuleRef) {
    const serviceName = CrudService.getName(Melon);
    super(moduleRef, Melon, melonSecurity(serviceName));
  }

  async $search(
    dto: SearchMelonDto,
    ctx: CrudContext,
    inheritance?: any,
  ): Promise<FindResponseDto<Melon>> {
    const query: Partial<Melon> = {};

    if (dto.nameLike) {
      query.name = new RegExp(dto.nameLike, 'i') as any;
    }

    if (dto.ownerEmail) {
      query.ownerEmail = dto.ownerEmail;
    }

    const fakeCtx: CrudContext = {
      ...ctx,
      query,
      data: null,
      origin: 'crud',
      method: 'GET',
    };

    await this.crudAuthorization.authorize(fakeCtx, this.security);

    if (dto.ids) {
      return this.$findIn(dto.ids, query, fakeCtx, inheritance);
    }
    return this.$find(query, fakeCtx, inheritance);
  }
}
