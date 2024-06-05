You can extend your [UserService](../user/service.md) to use third-party authentication services like [Google Identity](https://developers.google.com/identity){:target="_blank"} or [Facebook Login](https://developers.facebook.com/docs/facebook-login/){:target="_blank"}.

## Account Creation / Login

First, add a `thirdPartyAuth` field and a `thirdPartyUniqueId` field in your [user entity](../user/definition.md).

```typescript title="services/user/user.entity.ts"
@Entity()
export default class User implements CrudUser {

    //...

    @Property()
    thirdPartyAuth: string;

    @Property()
    thirdPartyUniqueId: string;

    //...

```

Then, generate a command to log/register with your third-party authentication provider.

```shell
eicrud generate cmd user linkGoogleAccount
```

Let's change the [DTO](../validation/definition.md) to accept the `id_token` used in your third-party identification process.

```typescript title="link_google_account.dto.ts"
import { IsString, IsIn } from 'class-validator';

export class LinkGoogleAccountDto {
  @IsString()
  id_token: string;

  @IsIn(['30m', '1d', '15d'])
  expiresIn: string;
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

You can now use your authentication provider's SDK to validate the received token and obtain the user unique ID.

```typescript title="link_google_account.action.ts"
import { UnauthorizedException } from '@nestjs/common';
import { CrudErrors } from '@eicrud/shared/CrudErrors';
import { User } from "../../user.entity";

export default async function link_google_account(dto: LinkGoogleAccountDto, service: UserService, ctx: CrudContext, inheritance?: any ){
    
    const { email, valid, uuid } = await googleSDK(dto.id_token); //pseudocode

    if(!valid){
      throw new UnauthorizedException(CrudErrors.INVALID_CREDENTIALS.str());
    }

    const entity = { thirdPartyUniqueId: uuid };
    let res = await service.$findOne(entity, ctx);

    if(!res){ // if user doesn't exist, we create a new account
        const user = new User();
        user.email = email;
        user.password = Math.random().toString(36);
        user.thirdPartyUniqueId = uuid;
        user.thirdPartyAuth = 'google';

        res = await service.$create(user, ctx);
    }

    return {
      userId: res[this.crudConfig.id_field],
      accessToken: await service.authService.signTokenForUser(res, dto.expiresIn),
    };

}
```

Finally, let's call the command from your front end.
```typescript 
const dto = { 
    id_token: 'f05415b13acb9590f70df862765c655f5a7a019e',
    expiresIn: '15d'
};

const { userId, accessToken } = await userClient.cmd('link_google_account', dto);

userClient.setJwt(accessToken, 15); // expires in 15 days
```
!!! note
    The [client](../client/setup.md)->`setJwt` method stores the provided token in storage to be used with every client request.

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

override async $renewJwt(ctx: CrudContext) {
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
      accessToken: await service.authService.signTokenForUser(res, dto.expiresIn, { id_token: dto.id_token}),
    };
    ```
    ```typescript
    // ...
    if(user.thirdPartyAuth){
        const id_token = ctx.jwtPayload.id_token;
        const renewed = await googleSDKRefresh(id_token) //pseudocode
        if(renewed){
            return super.$renewJwt(ctx, {id_token: renewed});
        }
        return { accessToken: null, refreshTokenSec: null};
    }
    ```

    
