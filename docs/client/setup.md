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
  expiresInSec: 60*30
}

await profileClient.login(dto);
```

!!! note
    Make sure to allow the `login` and `check_jwt` commands in your user service security. See [this example](../user/service.md#authentication).
    
### expiresInSec  
Indicates how long until the authentication token expires.
Maximum `expiresInSec` is specified in the `maxJwtexpiresInSec` [authentication option](../configuration/authentication.md).

!!! info
    If one of the clients encounters a `401` error, it will delete the JWT from storage, call the `onLogout` callback and retry the request as a [guest](../security/roles.md).

### checkJwt

You can call `checkJwt` to check if a user is currently logged in. It will extend the authentication duration if the `renewJwt` [option](../configuration/authentication.md) is set.

```typescript
const loggedUserId = await profileClient.checkJwt();
```
### logout

It is possible to manually log out.
```typescript
await profileClient.logout();
```


