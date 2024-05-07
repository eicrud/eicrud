
import { SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CrudSecurity } from '../crud/model/CrudSecurity';
import { CrudContext } from '../crud/model/CrudContext';
import { SecurityCacheManager } from '../crud/crud.config.service';
import { LRUCache } from 'lru-cache'
import { CrudUser } from '../user/model/CrudUser';


export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);


export const Context = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const context: CrudContext = request['crudContext'];
    return context;
  },
);

export class BasicMemoryCache implements SecurityCacheManager {
  cache: LRUCache<string, CrudUser>;

  constructor(size = 10000) {
    this.cache = new LRUCache({
      max: size,
    });
  }

  async get(key: string){
    return this.cache.get(key);
  }

  async set(key: string, value: any, ttl: number){
    return this.cache.set(key, value, {
      ttl: ttl,
    });
  }

  
}

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