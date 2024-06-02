Eicrud's services offer the following CRUD methods out of the box. Check out the [client page]() to call them from your front end.

!!! warning
    In the following examples CRUD methods are called directly from CrudServices, this means Security rules are **not** enforced and Validations/Transforms are **not** applied. All of the previous checks happen on the controller level.

## $create
Create a new entity.
```typescript
const newProfile: Partial<Profile> = {
    userName: "Jon Doe",
    owner: ctx.userId
}
await profileService.$create(newProfile, ctx);
```

## $createBatch
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

## $findOne
Find an entity.
```typescript
const query: Partial<Profile> = {
    userName: "Jon Doe",
}
const res: Profile = await profileService.$findOne(query, ctx);
```

## $find
Find entities.
```typescript
const query: Partial<Profile> = {
    astroSign: "Aries"
}
const {data, total, limit} = await profileService.$find(query, ctx);
```


## $findIds