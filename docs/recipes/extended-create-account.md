---
description: Let's extend Eicrud's create_account command to personalize the user's sign-up
---

As your application grows you might need to register additional fields when creating user accounts. To implement this we will extend the [create_account command](../user/service.md#account-creation) with a new one.

## Setup

First let's generate a new command with the [CLI](https://www.npmjs.com/package/@eicrud/cli){:target="_blank"}.

```bash
eicrud generate cmd user create_full_account
```

Then, add all the data you need to your newly created DTO.

```typescript title="create_full_account.dto.ts"
import { $Transform } from "@eicrud/core/validation";
import { IsString, IsOptional, IsEmail, IsBoolean, 
    Equals, MinLength, Matches  } from "class-validator";
import { RoleType } from "../../../../eicrud.roles";

export class CreateFullAccountDto {

    @IsOptional()
    @IsBoolean()
    logMeIn?: boolean;
  
    @IsEmail()
    @$Transform((value) => {
      return value.toLowerCase().trim();
    })
    email: string;
  
    @IsString()
    @MinLength(8)
    password: string;
  
    @IsString()
    @IsIn(['user', 'tester'])
    role: RoleType;

    @IsString()
    city: string;

    @Equals(true)
    acceptedEula: boolean;

}

// You can update the return DTO for better typing
export type CreateFullAccountReturnDto = {
    userId: string;
    accessToken: string;
};
```

Update the newly created security.

```typescript title="create_full_account.security.ts"
rolesRights: {
    guest: {
        async defineCMDAbility(can, cannot, ctx) {
            // Define abilities for user
            can(create_full_account, user, {role: 'user'});
        }
    },
}
```

And finally, call the original command inside the action, you can use the `addToUser` parameter to specify the new properties.


```typescript title="create_full_account.action.ts"
import { CreateAccountDto } 
    from "@eicrud/core/config/basecmd_dtos/user/create_account.dto";

export async function create_full_account(
    this: UserService,
    dto: CreateFullAccountDto,
    ctx: CrudContext,
    inheritance?: Inheritance,
  ): Promise<CreateFullAccountReturnDto> {
    
    const newDto: CreateAccountDto = {
      ...dto,
      addToUser: {
        city: dto.city,
        acceptedEula: dto.acceptedEula,
      }
    }

    return this.$create_account(newDto, ctx, inheritance);
  }
```

!!! note
    Properties passed to `addToUser` must exist in your user [Entity](../user/definition.md)

## Call your new [command](../services/commands.md)

You can now call `create_full_account` anywhere in your app.

```typescript
const dto = {
    email: 'new.user@mail.com',
    password: 'p4ssw0rd',
    role: 'user',
    city: 'Paris',
    acceptedEula: true
};

await userClient.cmd('create_full_account', dto);
```