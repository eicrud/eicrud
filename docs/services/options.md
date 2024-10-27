You can pass `CrudOptions` when performing [operations](operations.md) or [commands](commands.md).

```typescript
export interface ICrudOptions {
    populate?: string[];
    mockRole?: string;
    fields?: string[];
    limit?: number;
    offset?: number;
    cached?: boolean;
    allowIdOverride?: boolean;
    skipServiceHooks?: boolean;
    returnUpdatedEntities?: boolean;
}
```

Options are passed via the [context](../context.md):

```typescript
import { CrudContext } from "@eicrud/core/crud";

const query: Partial<Profile> = {
    astroSign: "Aries"
}
const ctx: Partial<CrudContext> = {
    options: {
        limit: 20
    }
}

const {data, total, limit} = await profileService.$find(query, ctx);
``` 

!!! note
    Check out the [client options page](../client/options.md) to use `CrudOptions` in your front-end.


### populate
Corresponds to [MikroOrm's populate option](https://mikro-orm.io/docs/populating-relations){:target="_blank"}.

### mockRole
Requests that include this option will perform as if the logged user has the role `mockRole`. To activate, [CrudRole](../security/roles.md)->`canMock` must be set.

!!! note
    `mockRole` is useful for testing authorizations without switching accounts. You can set [ClientConfig](../client/setup.md)->`globalMockRole` to mock roles from the client.

### fields
Corresponds to [MikroOrm's fields option](https://mikro-orm.io/docs/entity-manager#partial-loading){:target="_blank"}.

### limit
Corresponds to [MikroOrm's limit option](https://mikro-orm.io/docs/entity-manager#fetching-paginated-results){:target="_blank"}.

### offset
Corresponds to [MikroOrm's offset option](https://mikro-orm.io/docs/entity-manager#fetching-paginated-results){:target="_blank"}.

### cached
Indicate if `findOne` results should be fetched from the cache.
!!! note
    `cached` only works in client calls.

### allowIdOverride
Allow Entity primary keys to be pre-generated in $create operations.

!!! warning
     Letting users set their Entities' ID opens security risks. For example, impersonation of deleted entities.

### skipServiceHooks
Allow skipping of all service hooks.

!!! note 
    `skipServiceHooks` doesn't affect controller hooks.

### returnUpdatedEntities
Enable the return of updated/deleted entities in patch and delete operations.
 
!!! note 
    `returnUpdatedEntities` impacts the operation' performance.
