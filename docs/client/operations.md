---
description: Eicrud's client allows you to call service methods and commands over HTTP. It uses Axios under the hood.
---

Eicrud's **client** allows you to call [service methods](../services/operations.md) and [commands](../services/commands.md) over HTTP. It uses [Axios](https://axios-http.com/){:target="_blank"} under the hood.

!!! note
    When using the client, [security rules](../security/definition.md) and [Validations/Transforms](../validation/definition.md) are applied. These checks happen at the controller level.

## Create Operations

### create
Create a new entity. 
```typescript
const newProfile: Partial<Profile> = {
    userName: "Jon Doe",
    owner: '4d3ed089fb60ab534684b7e9'
}
await profileClient.create(newProfile);
```

### createBatch
Create new entities.
```typescript
const newProfiles: Partial<Profile>[] = [
    {
    userName: "Jon Doe",
    owner: '507f1f77bcf86cd799439011'
    },
    {
    userName: "Sarah Doe",
    owner: '507f191e810c19729de860ea'
    },
]

await profileClient.createBatch(newProfiles);
```

!!! info 
    Non-admin [roles](../security/roles.md) are not allowed to perform batch operations unless [maxBatchSize](../configuration/limits.md#crudsecurityrights) is specified in the service security. 

!!! note
    Batch operations make use of the [ClientOptions](./options.md)->`batchSize`. If the provided array exceeds that limit, the client will split it and perform multiple requests. 

## Read Operations

### findOne
Find an entity.
```typescript
const query: Partial<Profile> = {
    userName: "Jon Doe",
}
const res: Profile = await profileClient.findOne(query);
```

### find
Find entities.
```typescript
const query: Partial<Profile> = {
    astroSign: "Aries"
}
const {data, total, limit} = await profileClient.find(query);
```

!!! note
    [CrudServices](../services/definition.md) have an enforced [limit](../configuration/limits.md#limitoptions) for find operations. If you don't specify a limit in the [options](options.md), the clients will call the server repeatedly until it fetches all the results.

### findIn 
Find entities with IDs included in the provided list. 
```typescript
const ids = ['4d3ed089fb60ab534684b7e9', '4d3ed089fb60ab534684b7ff']
const {data, total, limit} = await profileClient.findIn(ids);
```
!!! note
    In queries also make use of the [ClientOptions](./options.md)->`batchSize` and will split the IDs if needed.

You can pass a limited query to findIn:
```typescript
const query = {
    id: ['4d3ed089fb60ab534684b7e9', '4d3ed089fb60ab534684b7ff'],
    astroSign: "Aries"
}
const {data, total, limit} = await profileClient.findIn(query);
```
!!! note
    Limited queries are useful when you have [security rules](../security/definition.md).

### findIds
Return IDs of entities that match a query.
```typescript
const query: Partial<Profile> = {
    astroSign: "Aries"
}
const {data, total, limit} = await profileClient.findIds(query);
const IDs: string[] = data;
```
!!! note
    `findIds` queries have a higher allowed [limit](../configuration/limits.md#limitoptions) than `find` queries. This is because returning only IDs has a smaller cost on the server than returning whole entities.

## Update Operations

### patchOne
Update an existing entity.
```typescript
const query: Partial<Profile> = {
    id: user.profileId
}
const update: Partial<Profile> = {
    bio: "Hello world"
}
await profileClient.patchOne(query, update); 
```
!!! note
    `patchOne` will throw if the queried entity doesn't exist.

### patch
Update every entity that matches a query.
```typescript
const query: Partial<Profile> = {
    astroSign: "Aries"
}
const update: Partial<Profile> = {
    bio: "Is passionate and motivated."
}
await profileClient.patch(query, update);
```
!!! note
    `patch` returns the number of entities affected by the operation


### patchIn
Update entities with IDs included in the provided list. 
```typescript
const ids = ['4d3ed089fb60ab534684b7e9', '4d3ed089fb60ab534684b7ff']
const update: Partial<Profile> = {
    bio: "Is nice."
}
await profileClient.patchIn(ids, update);
```

### patchBatch
Perform multiple `patch` operations.
```typescript
const updates = [
    {
        query: {
            astroSign: "Leo"
        },
        data: {
            bio: "Is generous."
        }
    },
    {
        query: {
            astroSign: "Taurus"
        },
        data: {
            bio: "Is relaxed."
        }
    },
]

await profileClient.patchBatch(updates);
```

You can also call `saveBatch` which automatically creates queries depending on provided limiting fields.

```typescript
const updates = [
    {
        astroSign: "Leo",
        bio: "Is generous."
    },
    {
        astroSign: "Taurus",
        bio: "Is relaxed."
    },
]

await profileClient.saveBatch(['astroSign'], updates);
```
!!! note
    The `id_field` if present, will always be passed to the query.

## Delete Operations

### removeOne
Delete an entity.
```typescript
const query: Partial<Profile> = {
    userName: "Jon Doe",
}
await profileClient.deleteOne(query);
```
!!! note
    `removeOne` will throw if the queried entity doesn't exist.


### remove
Remove every entity that matches a query.
```typescript
const query: Partial<Profile> = {
    astroSign: "Aries"
}

await profileClient.delete(query, ctx);
```
!!! note
    `remove` returns the number of entities affected by the operation

### removeIn
Remove entities with IDs included in the provided list. 
```typescript
const ids = ['4d3ed089fb60ab534684b7e9', '4d3ed089fb60ab534684b7ff']

await profileClient.deleteIn(query, ctx);
```

## Commands

### cmd
Call a service command:
```typescript 
const dto = { arg: 'world'};
const res = await profileClient.cmd('say_hello', dto);
```

### cmdL
Call a limited command:
```typescript 
const dto = { nameLike: 'Jon'};
const {data, total, limit} = await profileClient.cmdL('search', dto);
```
!!! note
    Like find operations, call to `cmdL` will fetch repeatedly if no [limit](./options.md) is specified.

### cmdS / cmdSL
Call a command in secure mode.
```typescript 
const dto = { arg: 'p4ssw0rd'};
const res = await profileClient.cmdS('secure_cmd', dto);
```
```typescript 
const dto = { nameLike: 'Jon'};
const {data, total, limit} = await profileClient.cmdSL('secure_search', dto);
```
!!! note
    When in secure mode, `ctx.user` is fetched from the database instead of the cache, ensuring up-to-date data.
