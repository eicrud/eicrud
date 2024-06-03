Eicrud handles the authentication of [users](./definition.md) in a global [NestJS guard](https://docs.nestjs.com/guards#guards){:target="_blank"}.

```typescript
export class AuthenticationOptions {
  SALT_ROUNDS = 11;
  SALT_ROUNDS_ADMIN = 14;
  VERIFICATION_EMAIL_TIMEOUT_HOURS = 6;
  TWOFA_EMAIL_TIMEOUT_MIN = 15;
  PASSWORD_RESET_EMAIL_TIMEOUT_HOURS = 6;
  PASSWORD_MAX_LENGTH = 64;
  JWT_SECRET = 'aeFzLsZAKL4153s9zsq2samXnv';
  JWT_FIELD_IN_PAYLOAD = ['revokedCount'];
  USERNAME_FIELD = 'email';
  renewJwt = false;
  minTimeBetweenLoginAttempsMs: number = 600;
  ALLOWED_JWT_EXPIRES_IN = ['1s', '15m', '30m', '1h', '2h', '6h', 
  '12h', '1d', '2d', '4d', '5d', '6d', '7d', '14d', '30d'];
  extractUserOnRoutes: string[] = [];
  TOKEN_LENGTH: number = 17;
}
```

Options are passed to the [CrudConfigService](../configuration/config-service.md).

```typescript title="eicrud.config.service.ts"
import { AuthenticationOptions } from '@eicrud/core/authentification';

const authenticationOptions = new AuthenticationOptions();

@Injectable()
export class MyConfigService extends CrudConfigService {
    constructor(/* ... */) {
        super({ authenticationOptions, /* ... */})
    }
    //..
}
```

## Custom routes

By default, Eicrud doesn't check the JWT token on non `/crud` routes. You can specify `extractUserOnRoutes` to change that behavior.

```typescript
authenticationOptions.extractUserOnRoutes = ['my-custom-route']
```
You can then retrieve the user in a [NestJS controller](https://docs.nestjs.com/controllers).
```typescript
import { CrudContext } from "@eicrud/core/crud";
import { Context } from "@eicrud/core/authentification";
import { Get, Query } from '@nestjs/common';

// ...

@Get('my-custom-route')
async get(@Query() query, @Context() ctx: CrudContext) {
    const user = ctx.user;
}
```

!!! note
    When calling your route, you must include the JWT token inside the authorization header.
    ```
    Authorization: Bearer <token>
    ```