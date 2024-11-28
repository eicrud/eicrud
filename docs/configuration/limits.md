---
description: Eicrud provides various ways to limit what users can do in your application. Here are the options.
comments: true
---

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
    skipQueryValidationForRoles: [],
    alwaysAllowedCrudOptions: [],
    //...

    }
}
```

#### **maxItemsInDb** 

Limit how many instances of an entity can be stored in DB. If `maxItemsInDb` is exceeded, calls to [CrudService](../services/definition.md)->`$create` will throw an error.

#### **maxItemsPerUser**

Limit how many instances of an entity a user can create.

!!! note
    You can set a default `maxItemsPerUser` for all your services in the [validation options](../configuration/validation.md). 

#### **additionalItemsInDbPerTrustPoints**

Add `x` additional allowed instances per user's [trust](../user/definition.md#trust) points.

#### **alwaysExcludeFields**
Always exclude specified entity fields from find [operations](../services/operations.md). 

#### **skipQueryValidationForRoles**
Disable read, update and delete query validation for specified roles (and their parents). See this [issue](https://github.com/eicrud/eicrud/issues/63) for more details. 

#### **alwaysAllowedCrudOptions**
Always allow specified [CrudOptions](../services/options.md) (for all roles).

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
    allowGetMethod?: boolean;
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
    `CrudOptions`->`limit` can be used in commands to return limited results. See this [tutorial](../recipes/search-command.md) for more info.

#### **allowGetMethod**
Allow the command to be used with a GET request. It is usefull for triggering a command with a simple URL.
!!! warning
    CSRF protection is not enforced on GET requests, make sure your command doesn't change your application state when enabling this.


## LimitOptions

```typescript title="eicrud.config.service.ts"
const limitOptions: LimitOptions = {
    nonAdminQueryLimit: 40,
    adminQueryLimit: 400,
    nonAdminQueryLimit_IDS: 4000,
    adminQueryLimit_IDS: 8000,
    maxFindInIdsLength: 250,
}

@Injectable()
export class MyConfigService extends CrudConfigService {
    constructor(/* ... */) {
        super({ limitOptions, /* ... */})
    }
    //..
}
```


