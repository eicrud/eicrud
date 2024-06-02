Install Eicrud's client in your front-end to query your services.

```
 npm i @eicrud/client
```

```typescript
const { CrudClient } = require('@eicrud/client')

const client = new CrudClient({serviceName: 'profile'})
const res = await client.findOne({userName: 'jon doe'})
```

!!! info 
    Non-admin [roles](roles.md) are not allowed to perform batch operations unless [maxBatchSize]() is specified.
