
import { SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CrudSecurity } from '../crud/model/CrudSecurity';
import { CrudContext } from '../crud/model/CrudContext';


export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);


export const Context = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const context: CrudContext = request['crudContext'];
    return context;
  },
);

export class AuthUtils {
  static isPublicKey(context, reflector: Reflector) {
    const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic;
  }

  //returns the fields of an object
  static getObjectFields(data: Object, head = null) {
    let fields = [undefined];
    if (!data) return fields;
    fields = Object.keys(data).reduce((acc, key) => {
      const newField = head ? `${head}.${key}` : key;
      if (typeof data[key] === 'object' && data[key] !== null) {
        return [...acc, ...AuthUtils.getObjectFields(data[key], newField)];
      }
      return [...acc, newField];
    }, []);
    return fields;
  }

}