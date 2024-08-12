Most of Eicrud's application configuration is done through the `CrudConfigService`. 
```typescript title="eicrud.config.service.ts"
@Injectable()
export class MyConfigService extends CrudConfigService {

    constructor(
        public userService: UserService,
        public entityManager: EntityManager,
        public emailService: EmailService,
        protected orm: MikroORM
    ) {
        super({
            userService,
            entityManager,
            emailService,
            jwtSecret: process.env.JWT_SECRET,
            cacheManager: new BasicMemoryCache(),
            orm,
            id_field: 'id',
            dbAdapter: new MongoDbAdapter(),
        });

        this.addRoles(roles);
    }

}
```

## Global Hooks
You can override some of your `CrudConfigService`'s methods, to define global hooks for your application.

**Controller hooks** are called before and after [CRUD](../services/operations.md) and [CMD](../services/commands.md) operations (at the controller level).
```typescript
override async afterControllerHook(res, ctx: CrudContext) {
    return Promise.resolve();
}
    
override async beforeControllerHook(ctx: CrudContext){
    return Promise.resolve();
}

override async errorControllerHook(error, ctx: CrudContext){
    return Promise.resolve();
}
```
!!! note
    **Controller hooks** will only trigger on operations initiated by the [client](../client/setup.md). Unlike [service-specific hooks](../hooks/service-hooks.md) that trigger on internal service calls.

**MsLink hooks** are called before and after a ms-link request is received in a [microservice](../microservices/configuration.md).
```typescript
override async afterMsLinkHook(res, ctx: CrudContext, query: MsLinkQuery, args: any[]) {
    return Promise.resolve();
}

override async beforeMsLinkHook(ctx: CrudContext, query: MsLinkQuery, args: any[]){
    return Promise.resolve();
}

override async errorMsLinkHook(error, ctx: CrudContext, query: MsLinkQuery, args: any[]){
    return Promise.resolve();
}
```
!!! note
    - It's better not to await function calls inside hooks when possible, this way errors won't prevent requests from returning data. 
    - Returning a value in an error hook prevents the error from throwing. The value is sent back to the client.


## Services

The `CrudConfigService` has access to all your [CrudServices](../services/definition.md) via the `servicesMap` property.

```typescript
override async afterControllerHook(res, ctx: CrudContext) {
    const profileService: CrudService<Profile> = this.servicesMap['profile'];
}
```


## Events
You can override some "event" methods as well.

**onHighTrafficEvent** will trigger when an abnormal amount of traffic is detected for a particular user.
```typescript
override async onHighTrafficEvent(count, user: CrudUser, ctx: CrudContext){
    return Promise.resolve();
}
```
