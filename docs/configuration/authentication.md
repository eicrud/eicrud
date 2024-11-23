---
description: Here's how to configure how Eicrud handles the authentication of users.
comments: true
---

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

By default, Eicrud doesn't check the authentication on non `/crud` routes. You can specify `extractUserOnRoutes` to change that behavior.

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
    When calling your route, the [JWT token](../client/jwt-storage.md) must be present in the request headers (as a Cookie or in the authorization header).
    ```
    Authorization: Bearer <token>;
    ```

    If your JWT is stored in an `httpOnly` cookie, the `eicrud-csrf` cookie (obtained during authentication) must be provided. You must provide it as a cookie and as a custom header of the same name to satisfy the [Double-submit Cookie Pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#signed-double-submit-cookie-recommended){:target="_blank"}, 


## Basic Auth

As an alternative to JWTs, you can use basic authentication to authorize your API requests. 
    ```
    Authorization: Basic <Base64(username:password)>;
    ```

!!! note 
    Basic authentication is slightly less performant than using JWTs. Consider this if you need to perform multiple requests.

## Username login

You can authenticate with usernames instead of emails for additional security. 

First, add a `username` field to your [User](../user/definition.md) entity.

```typescript title="services/user/user.entity.ts"
    // ... 
    @Unique()
    @Property()
    username: string;
    // ... 
```
Then update the `username_field` in your `AuthenticationOptions`.

```typescript title="eicrud.config.service.ts"
import { AuthenticationOptions } from '@eicrud/core/authentication';

const authenticationOptions = new AuthenticationOptions();
authenticationOptions.username_field = 'username';
// ...
```
Now you can use the [$create_account](../user/service.md#create_account) and [$login](../user/service.md#login) commands with the newly added field.
```typescript 

const dto: ICreateAccountDto = {
    email: 'new.user@mail.com',
    password: 'p4ssw0rd',
    username: 'jondoe62',
    role: 'user',
};

const { userId } = await userClient.cmdS('create_account', dto);

const dto: ILoginDto = {
    email: 'jondoe62',
    password: 'p4ssw0rd',
};

await userClient.login(dto);
```
