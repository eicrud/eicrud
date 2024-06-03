Eicrud provides various ways to limit what users can do in your application.

!!! note
    Most of these limits are enforced at the controller level. This means they will only apply when calling [operations](../services/operations.md) from the [client](../client/setup.md).

## [CrudSecurity](../security/definition.md)

```typescript title="service.security.ts"
export function getSecurity(entity: string): CrudSecurity { 
    return {

    maxItemsInDb: 1000,
    maxItemsPerUser: 10,
    additionalItemsInDbPerTrustPoints: 1,
    alwaysExcludeFields: ['password']
    //...

    }
}
```

#### **maxItemsInDb** 

Limit how many instances of an entity can be stored in DB. If `MaxItemsInDb` is exceeded, calls to [CrudService](../services/definition.md)->`$create` will throw an error.

#### **maxItemsPerUser**

Limit how many instances of an entity a user can create.

!!! note
    You can set a default `maxItemsPerUser` for all your services in the [validation options](../configuration/validation.md). 

#### **additionalItemsInDbPerTrustPoints**

Add `x` additional allowed instances per user's [trust](../user/definition.md#trust) points.

#### **alwaysExcludeFields**
Always exclude specified entity fields from find [operations](../services/operations.md). 

## CrudSecurityRights
```typescript title="service.security.ts"
rolesRights: {
    user: {
        maxBatchSize: 200,
        fields: ['size', 'price']
        // ...
    }
}
```
#### **maxBatchSize**
Allow a specific role to perform batch [operations](../services/operations.md).
!!! note
    You might want to keep batch size low for large entities. A large batch size will cause your server to use more RAM to operate.
    
#### **fields**
Limit the entity fields returned in find [operations](../services/operations.md) (to users of specified role).

## [CmdSecurity](../services/commands.md)
```typescript title="command.security.ts"
const getCmdSecurity = (command, user): CmdSecurity => { 
    return {

    maxUsesPerUser: 100,
    additionalUsesPerTrustPoint: 1,
    minTimeBetweenCmdCallMs: 500, //ms
    secureOnly: true,
    nonAdminQueryLimit: 50,
    adminQueryLimit: 200
    //...

    }
}
```
#### **maxUsesPerUser** 
Limit how many times a user can call the command.

#### **additionalUsesPerTrustPoint**

Add `x` additional uses per user's [trust](../user/definition.md#trust) points.

#### **minTimeBetweenCmdCallMs**
Minimum time required between cmd calls (for a specific user).

#### **secureOnly**
Indicate that the command can only be called in secure mode (POST). Secure mode always fetches the `ctx.user` from the database and never from the cache.

#### **nonAdminQueryLimit**
The default `CrudOptions`->`limit` set when calling the command (for non-admin users).

#### **adminQueryLimit**
The default `CrudOptions`->`limit` set when calling the command (for admin users).

!!! note
    `CrudOptions`->`limit` can be used in commands to return limited results. See this [tutorial](../recipes/search-command) for more info.



## LimitOptions

```typescript title="eicrud.config.service.ts"
const limitOptions: LimitOptions = {
    nonAdminQueryLimit: 40,
    adminQueryLimit: 400,
    nonAdminQueryLimit_IDS: 4000,
    adminQueryLimit_IDS: 8000,
    MAX_GET_IN: 250,
}

@Injectable()
export class MyConfigService extends CrudConfigService {
    constructor(/* ... */) {
        super({ limitOptions, /* ... */})
    }
    //..
}
```


