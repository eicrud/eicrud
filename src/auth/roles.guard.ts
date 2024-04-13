import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthUtils, CrudContext } from './auth.utils';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { httpAliasResolver } from './model/CrudSecurity';
import { defineAbility, subject } from '@casl/ability';
import { CrudEntity } from '../crud/model/crudEntity';
import { CrudRole } from './model/CrudRole';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, 
    protected roles: CrudRole[] = [],
    ) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    if (AuthUtils.isPublicKey(context, this.reflector)) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const crudContext: CrudContext = request['crudContext'];
    const fields = AuthUtils.getObjectFields(crudContext.data);
    
    if(crudContext.security.maxItemsPerUser && crudContext.method == 'POST'){
      const count = crudContext.user?.crudMap?.[crudContext.serviceName];
      if(count >= crudContext.security.maxItemsPerUser){
        throw new ForbiddenException(`You have reached the maximum number of items for this resource (${crudContext.security.maxItemsPerUser})`);
      }
    }
      const crudRole: CrudRole = this.roles.find(role => role.name == crudContext.user.role) || { name: 'guest' };

      const checkRes = this.recursCheckRolesAndParents(crudRole, crudContext, fields);

      if(!checkRes){
        let msg = `Role ${crudContext.user.role} is not allowed to ${crudContext.method} ${crudContext.serviceName} `;
        throw new ForbiddenException(msg);
      }

    return true;
  }

  recursCheckRolesAndParents(role: CrudRole, crudContext: CrudContext, fields: string[]): CrudRole|null{
    const roleRights = crudContext.security.rolesRights[role.name];
    const userAbilities = defineAbility((can, cannot) => {
        roleRights.defineAbility(can, cannot, crudContext);
        if(roleRights.fields && crudContext.method == 'GET'){
          crudContext.query._dto.fields = roleRights.fields;
        }
      },{resolveAction: httpAliasResolver});
      let allGood = true;
      for(const field of fields) {
        const sub = subject(crudContext.serviceName, crudContext.query);
        if(userAbilities.cannot(crudContext.method, sub, field)){
          allGood = false;
          break;
        }
      }
      if(allGood){
        return role;
      }
      if(role.inherits?.length){
        for(const parent of role.inherits){
          const parentRole = this.roles.find(role => role.name == parent);
          const checkRes = this.recursCheckRolesAndParents(parentRole, crudContext, fields)
          if(checkRes){
            return checkRes;
          }
        }
      }
      return null;
  }
}




