In Eicrud, every authenticated request fetches (from cache or DB) a `CrudUser` and stores it inside the [CrudContext](../context.md).  


## Entity
A `User` entity must be registered in a `CrudUserService` and passed to the [CrudConfigService]().

```typescript title="services/user/user.entity.ts"
@Entity()
export default class User implements CrudUser {

    @PrimaryKey({ name: '_id'})
    id: string;

    @Unique()
    @Property()
    email: string;

    //...

```

```typescript title="services/user/user.service.ts"
@Injectable()
export class UserService extends CrudUserService<User> {
    constructor(protected modRef: ModuleRef) {
        const serviceName = CrudService.getName(User);
        super(modRef, User, getSecurity(serviceName));
    }
}
```

```typescript title="eicrud.config.service.ts"
@Injectable()
export class MyConfigService extends CrudConfigService {
    constructor(public userService: UserService, ...) {
        super({
            userService,
            ...
      });
    }
}
```
!!! warning 
    Since `User` is fetched with every authenticated request, entity size will impact performance. Any information not frequently accessed should be stored in a [relationship](https://mikro-orm.io/docs/relationships){:target="_blank"}.
    ```typescript
    @Entity()
    export class Profile {
        
        ...

        @OneToOne(() => User, user => user.profile)
        user: User | string;

        @Property()
        biography: string;

        @Property()
        address: string;
    }
    ```

## Optimization
The user is retrieved from the [cacheManager]() if present, except in `POST` requests (`create` and secure CMDs) where it is always fetched from the database.

To keep your [authorization](../security/definition.md) fast, you might want to store useful info in the `User` entity. It will be available with every request.

```typescript 
@Entity()
export default class User implements CrudUser {

   @Property()
   moderationRights: string[];

   //...

```

```typescript
async defineCRUDAbility(can, cannot, ctx) {
  const userRights = ctx.user.moderationRights;
  const required = ctx.query.requiredRights;
    
  if(required.every((a) => userRights.includes(a))){
    can('update', 'article');
  }
}

```
