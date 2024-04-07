import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthUtils, CrudContext } from './auth.utils';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { httpAliasResolver } from './model/CrudSecurity';
import { defineAbility, subject } from '@casl/ability';
import { CrudEntity } from '../crud/model/crudEntity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, 
    protected orderedRoles: string[] = ['admin', 'manager', 'client', 'guest'],
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
      const count = crudContext.user.crudMap[crudContext.serviceName];
      if(count >= crudContext.security.maxItemsPerUser){
        throw new ForbiddenException(`You have reached the maximum number of items for this resource (${crudContext.security.maxItemsPerUser})`);
      }
    }

    const userAbilities = defineAbility((can, cannot) => {
      let rolePassed = false;
      for(const role of this.orderedRoles){
        if(crudContext.user.role == role || rolePassed){
          rolePassed = true;
          const roleRights = crudContext.security.rolesRights[role];
          roleRights.defineAbility(can, cannot, crudContext);
          if(roleRights.fields && crudContext.method == 'GET'){
            crudContext.query._dto.fields = roleRights.fields;
          }
        }
      }
      
    },{resolveAction: httpAliasResolver});

    fields.forEach(field => {
      const sub = subject(crudContext.serviceName, crudContext.query);
      
      if(userAbilities.cannot(crudContext.method, sub, field)){
        // const rule = userAbilities.relevantRuleFor(method, sub, field);
        let msg = `Role ${crudContext.user.role} is not allowed to ${crudContext.method} ${crudContext.serviceName} `;
   
        if(crudContext.query){
          msg += `Query: ${JSON.stringify(crudContext.query)} `;
        }
        if(crudContext.data){
          msg += `Data: ${JSON.stringify(crudContext.data)} `;
        }
        if(field){
          msg += `Field: ${field} `;
        }

        throw new ForbiddenException(msg);

      }
    });


    return true;
  }

}


