
## CrudOptions

You can pass the [CrudOptions](../services/options.md) with every client method call.

```typescript
import { ICrudOptions } from '@eicrud/shared/interfaces';

const query: Partial<Profile> = {
    astroSign: "Aries"
}
const crudOptions: ICrudOptions = {
    populate: ['owner'],
    limit: 40,
    offset: 80,
}
const {data, total, limit} = await profileClient.find(query, crudOptions);
```
!!! info
    `CrudOptions` must be allowed in the [security](../security/definition.md#options-abilities) before usage.

## ClientOptions 
Additional client options can be specified.
```typescript
export interface ClientOptions {
  batchSize?: number;
  batchField?: string;
  progressCallBack?: 
    (progress: number, total: number, type: 'limit' | 'batch') => Promise<void>;
}
```

### batchSize
Set the batch size for `batch`, `in` and `cmd` operations. When the input array exceeds that number, it will be split into multiple requests.

```typescript
import { ClientOptions } from '@eicrud/client';

const ids = ['4d3ed089fb60ab534684b7e9', '4d3ed089fb60ab534684b7ff', ...];
const copts: ClientOptions = {
    batchSize: 50
}
const {data, total, limit} = await profileClient.findIn(query);
```

!!! note 
    The `defaultBatchSize` is set in the [client config](setup.md) and defaults to 200.

### batchField
If you use batchSize for a `cmd` operation, `batchField` must be specified to indicate which DTO field holds the input array.

```typescript
import { ClientOptions } from '@eicrud/client';

const dto = {
    imports: [{ name: 'Jon', age: 22 }, { name: 'Sarah', age: 26 }, ...];
} 
const copts: ClientOptions = {
    batchSize: 50,
    batchField: 'imports'
}
await profileClient.cmd('batch_cmd', dto);
```

!!! note 
    You can use [ClientConfig](setup.md)->`cmdDefaultBatchMap` to avoid passing the `batchField` on every `cmd` call. 
    ```typescript
    const config: ClientConfig = {
        // ...
        cmdDefaultBatchMap: {
            'batch_cmd': {
                batchSize: 100,
                batchField: 'imports'
            }
        }
    }
    ```

### progressCallBack
When the client performs multiple requests (for limited or batched operations). It will call `progressCallBack` between every request. You can provide the callback to display loading information.
```typescript
import { ClientOptions } from '@eicrud/client';

function callback(progress: number, total: number, type: 'limit' | 'batch') {
    console.log(`Fetching all profiles: ${progress}/${total}`);
}

const query = {};
const copts: ClientOptions = {
    progressCallBack: callback
}

const {data, total, limit} = await profileClient.find(query);
```
!!! note 
    You can use [ClientConfig](setup.md)->`defaultProgressCallBack` to provide a default callback.
    ```typescript
    const config: ClientConfig = {
        // ...
        defaultProgressCallBack: myProgressCallBack
    }
    ```