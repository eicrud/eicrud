Install Eicrud's client in your front-end to query your services.

```
 npm i @eicrud/client
```
Each `CrudClient` is configured for one [CrudService](../services/definition.md).
```typescript
const { CrudClient, ClientConfig } = require('@eicrud/client')

const config: ClientConfig = {
  serviceName: 'profile',
  url: "https://<eicrud_app_host>"
}
const profileClient = new CrudClient(config)
```
```typescript
export interface ClientConfig { 
  serviceName: string, 
  url: string,
  onLogout?: () => void,
  storage?: ClientStorage, 
  id_field?: string,
  globalMockRole: string,
  defaultBatchSize?: number,
  cmdDefaultBatchMap?: { [key: string]: { batchField, batchSize: number} },
  limitingFields: string[],
  defaultProgressCallBack?: 
    (progress: number, total: number, type: 'limit' | 'batch') => Promise<void>,
};
```
## Login

You can use the client as a [guest](../security/roles.md) or log in as a specific user.

```typescript
const dto = {
  email: "myuser@mail.com",
  password: "p4ssw0rd",
  expiresIn: '30m'
}

await profileClient.login(dto);
```

!!! note
    Clients sharing their `ClientStorage` are logged together. 
    
### expiresIn  
Indicates how long until the authentication token expires.
Allowed `expiresIn` values are listed in the `allowedJwtExpiresIn` [authentication option](../configuration/authentication.md).

!!! info
    If one of the clients encounters a `401` error, it will delete the JWT from storage, call the `onLogout` callback and retry the request as a [guest](../security/roles.md).

### checkToken

You can call `checkToken` to check if a user is currently logged in. It will extend the authentication duration if the `renewJwt` [option](../configuration/authentication.md) is set.

```typescript
const loggedUserId = await profileClient.checkToken();
```
### logout

It is possible to manually log out.
```typescript
await profileClient.logout();
```

## Storage

By default, authentication tokens are stored in cookies or RAM (browser or node).

You can provide your own storage as long as it implements the `ClientStorage` interface.
```typescript
export interface ClientStorage {
  get(name: string): string;
  set(name: string, value: string, durationDays: number, secure: boolean): void;
  del(name: string): void;
}
```

