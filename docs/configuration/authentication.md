Eicrud handles the authentication of [users](../user/definition.md) in a global [NestJS guard](https://docs.nestjs.com/guards#guards){:target="_blank"}.

```typescript
export class AuthenticationOptions {
  saltRounds = 11;
  saltRoundsAdmin = 14;
  verificationEmailTimeoutHours = 6;
  twoFaEmailTimeoutMinutes = 15;
  passwordResetEmailTimeoutHours = 6;
  passwordMaxLength = 64;
  userFieldsInJwtPayload = ['rvkd'];
  fieldsThatResetRevokedCount = ['password', 'email'];
  username_field = 'email';
  renewJwt = false;
  minTimeBetweenLoginAttempsMs: number = 600;
  maxJwtexpiresInSec = 60*60*24*30; //30 days
  extractUserOnRoutes: string[] = [];
  resetTokenLength: number = 17;
}
```

Options are passed to the [CrudConfigService](../configuration/service.md).

```typescript title="eicrud.config.service.ts"
import { AuthenticationOptions } from '@eicrud/core/authentication';

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
import { Context } from "@eicrud/core/authentication";
import { Get, Query } from '@nestjs/common';

// ...

@Get('my-custom-route')
async get(@Query() query, @Context() ctx: CrudContext) {
    const user = ctx.user;
}
```

!!! note
    When calling your route, the JWT cookie must be present in the request headers
    ```
    Cookie: eicrud-jwt=<token>
    ```