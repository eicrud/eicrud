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
    Non-admin [roles](roles.md) are not allowed to perform batch operations unless [maxBatchSize](../configuration/limits.md#crudsecurityrights) is specified in the service security. 

!!! note
    If the provided array exceeds the max batch size, the client will split it and call the server as many times.

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
    [CrudServices](../services/definition.md) have an enforced [limit](../configuration/limits.md#limitoptions) for find operations. If you don't specify a limit in the [options](), the clients will call the server repeatedly until it fetches all the results.

## Update Operations

## Delete Operations

## Commands




