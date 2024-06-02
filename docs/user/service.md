`CrudUserService` has prebuilt [commands](../services/commands.md) you can use to manage your users. 

Some commands make use of the `EmailService`. The [CLI]()'s setup has a shell service that you can complete with your mailing provider api. 

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

## $create_account
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
const { userId, accessToken } = await userClient.cmd('create_account', dto);
userClient.setJwt(accessToken);
```

## $send_verification_email
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
await userClient.cmd('send_verification_email', {});

// change email
const dto: ISendVerificationEmailDto = {
    newEmail: 'new-email@mail.com';
    password: 'p4ssw0rd';
};
await userClient.cmd('send_verification_email', dto);
```