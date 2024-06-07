
Eicrud's [client](./setup.md) offers multiple ways to store the JWT token used for authentication.

## Browser environment

By default, JWTs are stored in your browser's [localStorage](https://developer.mozilla.org/docs/Web/API/Window/localStorage){:target="_blank} (or [sessionStorage](https://developer.mozilla.org/docs/Web/API/Window/sessionStorage){:target="_blank} when no `expiresInSec` option is provided).


### Cookie storage

For additional security, you can store your JWT in a `secure` `httpOnly` cookie. To do so, specify the `useSecureCookie` option when setting up your client.
```typescript
const { CrudClient, ClientConfig } = require('@eicrud/client')

const config: ClientConfig = {
  // ...
  useSecureCookie: true,
}
const profileClient = new CrudClient(config)
```
!!! note 
    You might need to update your [CORS configuration](https://docs.nestjs.com/security/cors){:target="_blank} if your client is served on a different domain than your Eicrud application. For example, if your Eicrud application is listening on `http://localhost:3000` and your client is served on `http://localhost:5173`:
    ```typescript title="./src/main.ts"
    // ...
    app.enableCors({
      origin: 'http://localhost:5173',
      credentials: true,
    });
    await app.listen(3000);
    ```

!!! info
    When using this cookie storage method, the JWT token is not accessible via javascript and therefore cannot be stolen in case of a Cross-site scripting (XSS) attack. However, keep in mind that a XSS vulnerability would still allow an attacker to perform requests on behalf of a connected user. Note that putting credentials in cookies opens the way for Cross-site request forgery (CSRF) attacks. Eicrud attempts to block these attacks using the [Double-submit Cookie Pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#signed-double-submit-cookie-recommended){:target="_blank"}.




## Server environment

When no `document` object is found, the client uses RAM to store your JWT token. You can provide your own storage to make the JWT persist on server shutdown (or to share it between clients).

```typescript
export interface ClientStorage {
  get(name: string): string;
  set(name: string, value: string, durationSeconds: number, secure: boolean): void;
  del(name: string): void;
}
```

```typescript
const { CrudClient, ClientConfig } = require('@eicrud/client')

const sharedStorage = new MyStorageClass();

const config: ClientConfig = {
  // ...
  storage: sharedStorage,
}
const profileClient = new CrudClient(config)
```