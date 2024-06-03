```typescript
export interface ICrudOptions {
    populate?: string[];
    mockRole?: string;
    fields?: string[];
    limit?: number;
    offset?: number;
    cached?: boolean;
}
```

### populate
Corresponds to [MikroOrm's populate option](https://mikro-orm.io/docs/populating-relations){:target="_blank"}.

### mockRole
The requests that include this option will perform as if the logged user has the role `mockRole`. To activate, [CrudRole](../security/roles.md)->`canMock` must be set.

!!! note 
    This option is useful for testing authorizations without switching accounts.

### fields
Corresponds to [MikroOrm's fields option](https://mikro-orm.io/docs/entity-manager#partial-loading){:target="_blank"}.

### 

