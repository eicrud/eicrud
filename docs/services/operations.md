---
description: Here's the list of the different service operations in Eicrud.
comments: true
---

Eicrud's services offer the following CRUD methods out of the box. Check out the [client page](../client/operations.md) to call them from your front end.

!!! warning
    In the following examples CRUD methods are called directly from CrudServices, this means Security rules are **not** enforced and Validations/Transforms are **not** applied. All these checks happen at the controller level.

!!! warning 
    For performance reasons, `$delete`, `$patch`,`$patchIn` and `$patchBatch` operations make use of MikroOrm's [native collection methods](https://mikro-orm.io/docs/usage-with-sql#native-collection-methods){:target="_blank"}. This means some of the ORM functionalities such as [cascading](https://mikro-orm.io/docs/cascading){:target="_blank"} and [lifecycle hooks](https://mikro-orm.io/docs/events){:target="_blank"} will not take trigger on these. 

## Create Operations

### $create
Create a new entity.
```typescript
const newProfile: Partial<Profile> = {
    userName: "Jon Doe",
    owner: ctx.userId
}
await profileService.$create(newProfile, ctx);
```

### $createBatch
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

await profileService.$createBatch(newProfiles, ctx);
```

## Read Operations


### $findOne
Find an entity.
```typescript
const query: Partial<Profile> = {
    userName: "Jon Doe",
}
const res: Profile = await profileService.$findOne(query, ctx);
```

### $find
Find entities.
```typescript
const query: Partial<Profile> = {
    astroSign: "Aries"
}
const {data, total, limit} = await profileService.$find(query, ctx);
```


### $findIn 
Find entities with IDs included in the provided list. 
```typescript
const ids = ['4d3ed089fb60ab534684b7e9', '4d3ed089fb60ab534684b7ff']
const {data, total, limit} = await profileService.$findIn(ids, {}, ctx);
```

## Update Operations

### $patchOne
Update an existing entity.
```typescript
const query: Partial<Profile> = {
    id: user.profileId
}
const update: Partial<Profile> = {
    bio: "Hello world"
}
await profileService.$patchOne(query, update, ctx); 
```
!!! note
    `$patchOne` will throw if the queried entity doesn't exist.

### $patch
Update every entity that matches a query.
```typescript
const query: Partial<Profile> = {
    astroSign: "Aries"
}
const update: Partial<Profile> = {
    bio: "Is passionate and motivated."
}
await profileService.$patch(query, update, ctx);
```
!!! note
    `$patch` returns the number of entities affected by the operation

### $patchIn
Update entities with IDs included in the provided list. 
```typescript
const ids = ['4d3ed089fb60ab534684b7e9', '4d3ed089fb60ab534684b7ff']
const update: Partial<Profile> = {
    bio: "Is nice."
}
await profileService.$patch(query, update, ctx);
```

### $patchBatch
Perform multiple `$patch` operations.
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

await profileService.$patchBatch(updates, ctx);
```

!!! note
    Updating to `undefined` has no effect.
    ```typescript
    await profileService.$patchOne({ id: user.profileId }, { bio: undefined }, ctx);
    // will not delete the profile bio

    await profileService.$patchOne({ id: user.profileId }, { bio: null }, ctx);
    // will set the bio to null
    ```
    
## Delete Operations

### $deleteOne
Delete an entity.
```typescript
const query: Partial<Profile> = {
    userName: "Jon Doe",
}
await profileService.$deleteOne(query, ctx);
```
!!! note
    `$deleteOne` will throw if the queried entity doesn't exist.

### $delete
Remove every entity that matches a query.
```typescript
const query: Partial<Profile> = {
    astroSign: "Aries"
}

await profileService.$delete(query, ctx);
```
!!! note
    `$delete` returns the number of entities affected by the operation

### $deleteIn
Remove entities with IDs included in the provided list. 
```typescript
const ids = ['4d3ed089fb60ab534684b7e9', '4d3ed089fb60ab534684b7ff']

await profileService.$deleteIn(query, ctx);
```