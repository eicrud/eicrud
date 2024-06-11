[CrudServices](./definition.md) can store single results in a cache.

By default, a basic in-memory (RAM) cache is used.

## Configuration

You can provide your own distributed cache, as long as it implements the `CrudCache` interface.

```typescript
export interface CrudCache {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any, ttl: number) => Promise<any>;
}
```

You can provide it globally through the `CrudConfigService`.

```typescript title="eicrud.config.service.ts"

let myCache: CrudCache = ...

@Injectable()
export class MyConfigService extends CrudConfigService {
    constructor(/* ... */) {
        super({ cacheManager: myCache , /* ... */})
    }
    //..
}
```

Or you can provide it to a specific service.

```typescript title="user.service.ts"

let myCache: CrudCache = ...

@Injectable()
export class UserService extends CrudUserService<User> {
        constructor(/* ... */) {
        super( /* ... */, { cacheManager: myCache })
    }
    //..
}
```

## Usage

`CrudUserService` has several methods that access the cache.

### $findOneCached
`$findOneCached` tries to retrieve the result from the cache using `id_field` + `CrudOptions?` as a key.
If no result is found, `$findOne` is called and the result is stored in cache.

### $setCached
`$setCached` inserts a given entity into the `CrudCache`.

!!! note
    When `$findOneCached` is called through the client, found results are not stored in the cache to prevent users from maliciously filling it. You can disable that behavior with `allowClientCacheFilling`.
    ```typescript 
    cacheOptions.allowClientCacheFilling = true;
    ```
    In that case, make sure your cache has a maximum and an eviction strategy in place.
    

## Authentication

During authentication, the user is fetched with `CrudUserService`->`$findOneCached`.
!!! note
    The `CrudCache` of `CrudUserService` has a great impact on your application performance since users are fetched in every authenticated request.

## Options

```typescript
export class CacheOptions {
    TTL = 60 * 12 * 1000; // 12 minutes
    allowClientCacheFilling = false;
}

```
```typescript title="profile.service.ts"
import { CacheOptions } from '@eicrud/core/config';

const cacheOptions = new CacheOptions();

@Injectable()
export class ProfileService extends CrudService<Profile> {
        constructor(/* ... */) {
        super( /* ... */, { cacheOptions })
    }
    //..
}
```