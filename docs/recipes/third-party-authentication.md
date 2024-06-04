You can extend your [UserService](../user/service.md) to use third-party authentication services like [Google Identity](https://developers.google.com/identity){:target="_blank"} or [Facebook Login](https://developers.facebook.com/docs/facebook-login/){:target="_blank"}.

## Account Creation / Login

First, we add a `thirdPartyAuth` field in your [user entity](../user/definition.md).

```typescript title="services/user/user.entity.ts"
@Entity()
export default class User implements CrudUser {

    //...

    @Property()
    thirdPartyAuth: string;

    //...

```

Then, we generate a command to log/register with our third-party authentication provider.

```shell
eicrud generate cmd user linkGoogleAccount
```

Let's change the [DTO](../validation/definition.md) to accept the `id_token` used in your third-party identification process.

```typescript title="link_google_account.dto.ts"
export class LinkGoogleAccountDto {
  @IsString()
  id_token: string;
}
```

Then, let's allow guests to use the `linkGoogleAccount` command in the security.
```typescript title="link_google_account.security.ts"
const getCmdSecurity = (link_google_account, profile): CmdSecurity => { 
    return {
        dto: LinkGoogleAccountDto,
        rolesRights: {
            guest: {
                async defineCMDAbility(can, cannot, ctx) {
                    // Define abilities for guest
                    can(link_google_account, profile);
                }
            }
        },
    }
}
```

We can now use your authentication provider's SDK to validate the received token and obtain the user email.

```typescript title="link_google_account.action.ts"
import { UnauthorizedException } from '@nestjs/common';
import { CrudErrors } from '@eicrud/shared/CrudErrors';
import { User } from "../../user.entity";

export default async function link_google_account(dto: LinkGoogleAccountDto, service: UserService, ctx: CrudContext, inheritance?: any ){
    
    const { email, valid } = await googleSDK(dto.id_token); //pseudo code

    if(!valid){
      throw new UnauthorizedException(CrudErrors.INVALID_CREDENTIALS.str());
    }

    const entity = {};
    entity[service.username_field] = dto.email;
    let res = await service.$findOne(entity, ctx);

    if(!res){ // if user doesn't exist, we create a new account
        const user = new User();
        user.email = email;
        user.password = Math.random().toString(36);
        user.thirdPartyAuth = 'google';

        res = await service.$create(user, ctx);
    }

    return {
      userId: res[this.crudConfig.id_field],
      accessToken: await service.authService.signTokenForUser(res),
    };

}
```


## Disable regular login

You can disable regular login for users registered with third-party authentication. To do so simply extend the `$authUser` method of your [UserService](../user/service.md). 

```typescript title="user.service.ts"
import { UnauthorizedException } from '@nestjs/common';

// ...

override async $authUser(
    ctx: CrudContext,
    user: CrudUser,
    pass,
    expiresIn = '30m',
    twoFA_code?,
) {
    if(user.thirdPartyAuth){
        throw new UnauthorizedException('Must use third party login command.');
    }
    return super.$authUser(ctx, user, pass, expiresIn, twoFA_code);
}

// ...
```

## Renew JWT

When calling [checkJwt](../user/service.md#authentication), the validity of an issued token is automatically extended. You might want to change that behavior for users authenticated with third-parties.

You can disable the renewal by setting `noTokenRefresh` when creating your user.

```typescript title="link_google_account.action.ts"
        // ...
        user.thirdPartyAuth = 'google';
        user.noTokenRefresh = true;
        // ...
```

Alternatively, you can extend the `$renewJwt` method of your [UserService](../user/service.md) to handle that behavior manually.

```typescript title="user.service.ts"
// ...

async $renewJwt(ctx: CrudContext) {
    const user = ctx.user;

    if(user.thirdPartyAuth){
        return { accessToken: null, refreshTokenSec: null};
    }

    return super.$renewJwt(ctx);
}

// ...
```

!!! note 
    The method `signTokenForUser` let you store additional data in your JWT (accessible with [CrudContext](../context.md)->`jwtPayload`). You can use this to store the `id_token` and check your third-party authentication provider before renewing a JWT.
    ```typescript
    return {
      userId: res[this.crudConfig.id_field],
      accessToken: await service.authService.signTokenForUser(res, { id_token: dto.id_token}),
    };
    ```
    ```typescript
    // ...
    if(user.thirdPartyAuth){
        const id_token = ctx.jwtPayload.id_token;
        const renewed = await googleSDKRefresh(id_token) //pseudo code
        if(renewed){
            return super.$renewJwt(ctx, {id_token: renewed});
        }
        return { accessToken: null, refreshTokenSec: null};
    }
    ```

    
