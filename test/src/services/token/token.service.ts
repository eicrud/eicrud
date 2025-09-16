import { ModuleRef } from '@nestjs/core';
import { Token } from './token.entity';
import { Injectable } from '@nestjs/common';
import { getSecurity } from './token.security';
import { CrudService, Inheritance, CrudContext } from '@eicrud/core/crud';
import { serviceCmds } from './cmds';
import { hooks } from './token.hooks';

@Injectable()
export class TokenService extends CrudService<Token> {
  constructor(protected moduleRef: ModuleRef) {
    const serviceName = CrudService.getName(Token);
    super(moduleRef, Token, getSecurity(serviceName), { hooks });
  }

  // GENERATED START - do not remove
}
