`CrudUserService` has prebuilt [commands](../services/commands.md) you can use to manage your users. 

Some commands make use of the `EmailService`. The [CLI](https://www.npmjs.com/package/@eicrud/cli){:target="_blank"}'s setup has a shell service that you can complete with your mailing provider api. 

```typescript title="services/email/email.service.ts"
export class EmailService extends CrudService<Email> implements EmailService {
    //...
    sendVerificationEmail(to: string, token: string, ctx: CrudContext): Promise<any> {
        console.log('Sending verification email to', to, 'with token', token);
        return Promise.resolve();
    }
    sendTwoFactorEmail(to: string, code: string, ctx: CrudContext): Promise<any> {
        console.log('Sending two factor email to', to, 'with code', code);
        return Promise.resolve();
    }
    sendPasswordResetEmail(to: string, token: string, ctx: CrudContext): Promise<any> {
        console.log('Sending password reset email to', to, 'with token', token);
        return Promise.resolve();
    }
}
```
Each command must be allowed in the [security](../security/definition.md) before usage.  

## Account creation

### $create_account
```typescript title="create_account.security.ts"
guest: {
    async defineCMDAbility(can, cannot, ctx) {
        can('create_account', 'user', { role: 'user' });
        // guest can create_account with role == 'user'
    }
}
```
```typescript 
import { ICreateAccountDto } from '@eicrud/shared/interfaces';

const dto: ICreateAccountDto = {
    email: 'new.user@mail.com';
    password: 'p4ssw0rd';
    role: 'user';
};
const { userId, accessToken } = await userClient.cmdS('create_account', dto);
userClient.setJwt(accessToken);
```

## Authentication

### $login
```typescript title="login.security.ts"
guest: {
    async defineCMDAbility(can, cannot, ctx) {
        can('login', 'user');
        // guest can login
    }
}
```
```typescript 
import { ILoginDto } from '@eicrud/shared/interfaces';

const dto: ILoginDto = {
    email: 'new.user@mail.com';
    password: 'p4ssw0rd';
};

await userClient.login(dto);
```

### $check_jwt
```typescript title="login.check_jwt.ts"
guest: {
    async defineCMDAbility(can, cannot, ctx) {
        can('check_jwt', 'user');
        // guest can check_jwt
    }
}
```
```typescript 
await userClient.checkJwt();
```

!!! note
    Authentication commands have their own methods in the client for ease of use. Check out the [client page](../client/setup.md) for more information.

## Email management

### $send_verification_email
```typescript title="send_verification_email.security.ts"
user: {
    async defineCMDAbility(can, cannot, ctx) {
        can('send_verification_email', 'user');
        // user can send_verification_email
    }
}
```
```typescript 
import { ISendVerificationEmailDto } from '@eicrud/shared/interfaces';

// verify current email
await userClient.cmdS('send_verification_email', {});

// change email
const dto: ISendVerificationEmailDto = {
    newEmail: 'new-email@mail.com';
    password: 'p4ssw0rd';
};
await userClient.cmdS('send_verification_email', dto);
```
### $verify_email

```typescript title="verify_email.security.ts"
guest: {
    async defineCMDAbility(can, cannot, ctx) {
        can('verify_email', 'user');
        // guest can verify_email
    }
}
```
```typescript 
import { IVerifyTokenDto } from '@eicrud/shared/interfaces';

const dto: IVerifyTokenDto = {
    token_id: "k2Urz2b703aP6zQ_4d3ed089fb60ab534684b7ff"
    // email received token 
};
await userClient.cmdS('verify_email', dto);
```

## Password management

### $send_password_reset_email

```typescript title="send_password_reset_email.security.ts"
guest: {
    async defineCMDAbility(can, cannot, ctx) {
        can('send_password_reset_email', 'user');
        // guest can send_password_reset_email
    }
}
```
```typescript 
import { ISendPasswordResetEmailDto } from '@eicrud/shared/interfaces';

const dto: ISendPasswordResetEmailDto = {
    email: "my-email@mail.com"
    // user email 
};
await userClient.cmdS('send_password_reset_email', dto);
```

### $reset_password

```typescript title="reset_password.security.ts"
guest: {
    async defineCMDAbility(can, cannot, ctx) {
        can('reset_password', 'user');
        // guest can reset_password
    }
}
```
```typescript 
import { IResetPasswordDto } from '@eicrud/shared/interfaces';

const dto: IResetPasswordDto = {
    token_id: "k2Urz2b703aP6zQ_4d3ed089fb60ab534684b7ff",
    // email received token 
    newPassword: "w0rdp4ss",
    expiresIn: "30min"
    // log user for 30 min
};
const { accessToken } = await userClient.cmdS('reset_password', dto);
userClient.setJwt(accessToken, 1); // save token for 1 day
```

### $change_password

```typescript title="change_password.security.ts"
user: {
    async defineCMDAbility(can, cannot, ctx) {
        can('change_password', 'user');
        // user can change_password
    }
}
```
```typescript 
import { IChangePasswordDto } from '@eicrud/shared/interfaces';

const dto: IChangePasswordDto = {
    oldPassword: "p4ssw0rd",
    newPassword: "w0rdp4ss",
    expiresIn: "30min"
    // log user for 30 min
};
const { accessToken } = await userClient.cmdS('change_password', dto);
userClient.setJwt(accessToken, 1); // save token for 1 day
```

## Session kick

### $logout_everywhere
```typescript title="logout_everywhere.security.ts"
user: {
    async defineCMDAbility(can, cannot, ctx) {
        can('logout_everywhere', 'user', { userId: ctx.userId });
        // user can logout_everywhere for own userId
    }
}
```
```typescript 
import { IChangePasswordDto } from '@eicrud/shared/interfaces';

const dto: IUserIdDto = {
    userId
};
await userClient.cmdS('logout_everywhere', dto);
```

!!! note 
    Calling `logout_everywhere` will invalidate all issued tokens for a user. It is automatically called when updating fields included in [AuthenticationOptions](../configuration/authentication.md)->`fieldsThatResetRevokedCount`.


## Moderation

### $timeout_user
```typescript title="timeout_user.security.ts"
moderator: {
    async defineCMDAbility(can, cannot, ctx) {
          const dto: ITimeoutUserDto = ctx.data;
          const allowed = ['user', 'vip'];
          if (
            dto.allowedRoles?.length &&
            dto.allowedRoles.every((r) => allowed.includes(r))
          ) {
            can(baseCmds.timeoutUser.name, 'user');
          }
    }
}
```
```typescript 
import { ITimeoutUserDto } from '@eicrud/shared/interfaces';

const dto: ITimeoutUserDto = {
    userId: "507f191e810c19729de860ea",
    timeoutDurationMinutes: 10, // will ban user for 10 min
    allowedRoles: ['user'],
};

await userClient.cmdS('timeout_user', dto);
```