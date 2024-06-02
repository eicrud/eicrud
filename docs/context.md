Each request in Eicrud is assigned a `CrudContext`. It contains various information about the request and authenticated user.

```typescript
export interface CrudContext {
    
    user?: CrudUser, 
    userId?: string,
    query?: any, 
    data?: any,
    options?: CrudOptions,
    getCurrentService?: () => CrudService<any>;
    getRequest?: () => any;

    // ...
}
```
## Availability

The `CrudContext` is available in [defineAbility functions](./security/definition.md).

```typescript
import { CrudContext } from "@eicrud/core/crud";

//...

async defineCRUDAbility(can, cannot, ctx: CrudContext) {
    // Define abilities for user
    const userId = ctx.userId;
}
```

In [command](./services/commands.md) implementations.
```typescript
async $say_hello(dto: SayHelloDto, ctx: CrudContext, inheritance?: any) {
   const user = ctx.user;
}
```
And in [hook functions](./configuration/config-service.md).
```typescript
async afterCrudHook(res: any, ctx: CrudContext) {
    return Promise.resolve();
}
```
## Caching
You can store data in the context and it will be available globally through your request. 
```typescript
async defineCRUDAbility(can, cannot, ctx) {
   ctx.my_prop = { message: "hello world"};
}
```
!!! warning
    Storing circular references in the `CrudContext` will break your microservice configuration since `ctx` is often serialized in [dollar functions](./microservices/dollar-functions.md). You can store such objects in the `_temp` property which is always deleted before serialization (it will be limited to the current ms).