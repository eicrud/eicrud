A security dictates how a resource can be accessed by [roles](./roles.md). Each service and command has its own security.

Securities let you use the [CASL](https://casl.js.org/){:target="_blank"} library to define abilities for your services.

## [Service](../services/definition.md) security

The service security defines who can access or modify the [entity](../services/entity.md). Its abilities are categorized as crud operations :

```typescript
{
    'create': ['POST'],
    'read': ['GET'],
    'update': ['PATCH'],
    'delete': ['DELETE'],
    'crud': ['POST', 'GET', 'PATCH', 'DELETE'],
    'cru': ['POST', 'GET', 'PATCH'],
    'crd': ['POST', 'GET', 'DELETE'],
    'cud': ['POST', 'PATCH', 'DELETE'],
    'rud': ['GET', 'PATCH', 'DELETE'],
    'cr': ['POST', 'GET'],
    'cu': ['POST', 'PATCH'],
    'cd': ['POST', 'DELETE'],
    'ru': ['GET', 'PATCH'],
    'rd': ['GET', 'DELETE'],
    'ud': [ 'PATCH', 'DELETE'],
}
```
Ability syntax is `can(<operation>, <service>, ...args)`:
```typescript title="services/profile/profile.security.ts"
user: {
  async defineCRUDAbility(can, cannot, ctx) {
    can('crud', 'profile', { owner: ctx.userId }); // can crud own profile
    can('read', 'profile') // can read all profiles
  }
}
```
The following `...args` can be **fields** or **query**.

**Fields** are the [entity](./../services/entity.md) fields that can be modified (for `'create'` and `'update'` operations).
```typescript
moderator: {
  async defineCRUDAbility(can, cannot, ctx) {
    can('update', 'profile', ['bio']); // can update all profiles, but only their bio
    
    can('create', 'ticket'); // can create any ticket
    cannot('create', 'ticket', ['priority']) // but not with priority specified
  }
}
```
**Query** is the entity query for `read`, `update` and `delete` operations. It's the data for `create`.
```typescript
writer: {
  async defineCRUDAbility(can, cannot, ctx) {
    can('create', 'article', { author: ctx.userId }); //can create article with author == userId
    can('update', 'article', { author: ctx.userId }); //can update articles where author == userId
    can('delete', 'article', { author: ctx.userId }); //can delete articles where author == userId

    // equivalent to:
    can('cud', 'article', { author: ctx.userId }); 
  }
}
```
You can use both **fields** and **query** at the same time:
```typescript
moderator: {
  async defineCRUDAbility(can, cannot, ctx) {
    const user = ctx.user;
    can('update', 'article', ['isApproved'], { group: user.groupId });
    // can only update isApproved field on articles of group user.groupId
  }
}
```
## Options abilities
Service security also defines abilities for options.
Ability syntax is `can(<option_field>, <service_name>, ...args)`, for example: 
```typescript title="services/profile/profile.security.ts"
user: {
  async defineCRUDAbility(can, cannot, ctx) {
      can('read', 'profile'); 
  },
  async defineOPTAbility(can, cannot, ctx) {
      can('populate', 'profile'); 
      // user can call find with any options.populate value
  }
}
```

The following `...args` can be **fields** or **query**.
  
**Fields** are the allowed values for the option.
```typescript
async defineOPTAbility(can, cannot, ctx) {
    can('populate', 'profile', ['pictures']); 
    // can call find with options.populate = ['pictures']
},
```
!!! note
    `defineOPTAbility`'s fields argument has a different meaning than in other "define functions".

**Query** is the same as for `defineCRUDAbility`: entity query or data.
```typescript
async defineOPTAbility(can, cannot, ctx) {
    can('populate', 'profile', ['pictures']); 
    // can call find with options.populate = ['pictures']
    can('populate', 'profile', ['owner'], { owner: ctx.userId }); 
    // can call find with options.populate = ['owner'] / ['pictures', 'owner']
    // when query.owner == ctx.userId
},
```

## [Command](../services/commands.md) security
The command security defines which roles can perform the command and how.

Ability syntax is `can(<cmd_name>, <service_name>, ...args)`, for example:
```typescript title="say_hello.security.ts"
user: {
  async defineCMDAbility(can, cannot, ctx) {
    can('say_hello', 'profile') // users can call say_hello on service profile
  }
}
```
The following `...args` can be **fields** or **query**.

**Fields** and **Query** represent the command DTO's instance.
```typescript
export default class SayHelloDto {
    @IsString()
    arg: string;

    @IsString()
    @IsOptional()
    forbiddenField: string;
}
```
```typescript
user: {
  async defineCMDAbility(can, cannot, ctx) {
    can('say_hello', 'profile', { arg: "world"}) // users can call say_hello with arg == world
    cannot('say_hello', 'profile', ['forbiddenField']) // users cannot call say_hello with forbiddenField defined

    // equivalent to:
    can('say_hello', 'profile', ['arg'], { arg: "world"}) 
  }
}
```

## Access the [CrudContext](../context.md)
You can access the CrudContext of the current request when defining abilities.
```typescript
user: {
  async defineCRUDAbility(can, cannot, ctx) {
      const data = ctx.data;
      const query = ctx.query
      const user =  ctx.user
  },
}
```

## Fetching during authorization
`defineAbility` functions are async which means you can fetch additional data before authorizing a request.
```typescript
user: {
  async defineCRUDAbility(can, cannot, ctx) {
    const canRead = await fetchInfoFromDb(ctx);
    if(canRead){
        can('read', 'profile')
    }
    
    const canUpdate = await fetchInfoFrom3rdParty(ctx);
    if(canUpdate){
        can('update', 'profile')
    }
  }
}
```
However, doing so may increase your operations' response time **significantly**.
!!! warning 
    `defineAbility` functions are called for **each** resource when authorizing batch operations. For example, a [batch create]() of X items, will call `defineCRUDAbility` X times. You should implement some caching to avoid redundant fetches. A basic cache can be stored in the `ctx` since it is unique to each request.
    ```typescript
    async defineCRUDAbility(can, cannot, ctx) {
        let res = getFromCache(ctx);
        if(!res){
            res = await fetchFromDb(ctx);
        }
        if(res.value){
            can('create', 'profile')
        }
    }
    ```

## Comparing arrays
[CASL's array comparison operators](https://casl.js.org/v6/en/guide/conditions-in-depth#supported-operators){:target="_blank"} can be misleading in Eicrud's context (checks for **intersection**, not inclusion/exclusion). You can verify arrays using JS functions when in doubt.
```typescript
moderator: {
  async defineCRUDAbility(can, cannot, ctx) {
    const userAuths = ctx.user.modAuthorizations;
    const articleAuths = ctx.query.requiredAuthorizations;
    
    if(articleAuths.every((a) => userAuths.includes(a))){
      can('update', 'article', ['isApproved']);
    }
  }
}
```