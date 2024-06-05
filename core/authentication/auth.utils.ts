import { SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CrudSecurity } from '../config/model/CrudSecurity';
import { CrudContext } from '../crud/model/CrudContext';
import { CrudCache } from '../config/crud.config.service';
import { CrudUser } from '../config/model/CrudUser';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const Context = createParamDecorator(
  (data: unknown, exctx: ExecutionContext) => {
    const request = exctx.switchToHttp().getRequest();
    const ctx: CrudContext = request['crudContext'];
    return ctx;
  },
);

export class AuthUtils {
  static isPublicKey(ctx, reflector: Reflector) {
    const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    return isPublic;
  }

  //returns the fields of an object
  static getObjectFields(data: object, head = null) {
    let fields = ['all'];
    if (!data) return fields;
    fields = Object.keys(data);
    // .reduce((acc, key) => {
    //   const newField = head ? `${head}.${key}` : key;
    //   if (typeof data[key] === 'object' && data[key] !== null) {
    //     return [...acc, ...AuthUtils.getObjectFields(data[key], newField)];
    //   }
    //   return [...acc, newField];
    // }, []);
    return fields;
  }
}
