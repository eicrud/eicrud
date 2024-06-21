If you need to perform complex queries, [read operations](../services/operations.md) may not suffice. 

You can create a `search` command to use the full potential of your Database / [ORM](https://mikro-orm.io/){:target="_blank"}.

## Setup

Start by generating a new cmd using the [CLI](https://www.npmjs.com/package/@eicrud/cli){:target="_blank"}.

```shell
eicrud generate cmd profile search
```

Let's change the [DTO](../validation/definition.md) to accept a string to be used as a regex:

```typescript title="search.dto.ts"
export class SearchDto {
  @IsString()
  @$Transform((v: string) => v.replace(/[.*+?^$}{)(|[\]\\]/g, '\\$&'))
  userNameLike: string;

  @IsOptional()
  @IsString()
  visibility?: 'public' | 'private';
}
```
!!! note
    We escape `userNameLike` of any regex character to avoid potential regex attacks (ReDoS).

Then, let's allow guests to use the search command in the security:
```typescript title="search.security.ts"
const getCmdSecurity = (search, profile): CmdSecurity => { 
    return {
        dto: SearchDto,
        rolesRights: {
            guest: {
                async defineCMDAbility(can, cannot, ctx) {
                    // Define abilities for guest
                    can(search, profile);
                }
            }
        },
    }
}
```
Alternatively, you can use the `guestCanUseAll` parameter for better performance.
```typescript title="search.security.ts"
const getCmdSecurity = (search, profile): CmdSecurity => { 
    return {
        dto: SearchDto,
        rolesRights: {},
        guestCanUseAll: true
    }
}
```

## Implementation

We can now implement the command action, to make things simpler we use the [CrudService->$find](../services/operations.md#read-operations) method.

```typescript title="search.action.ts"
export async function search(this: ProfileService, dto: SearchDto, ctx: CrudContext, inheritance?: any ){
    const query: Partial<Profile> = {
      userName: new RegExp(dto.userNameLike, 'i') as any,
    };

    if (dto.visibility) {
      query.visibility = dto.visibility as any;
    }

    const fakeCtx: CrudContext = {
      ...ctx,
      query,
      data: null,
      origin: 'crud',
      method: 'GET',
    };

    await this.crudAuthorization.authorize(fakeCtx, this.security);

    return this.$find(query, fakeCtx, inheritance);
}
```
!!! note
    The call to `service.crudAuthorization.authorize` allows us to use the CRUD [security](../security/definition.md) for `read` operations. Anything forbidden for `$find` will be forbidden in our `search` cmd as well. 
    ```typescript title="profile.security.ts"
    guest: {
        async defineCRUDAbility(can, cannot, ctx) {
            can('read', profile, { visibility: 'public'});
        },
    },
    ```


## Usage

Since `search` returns the result of `$find`, it behaves as a limited command.

In our front-end, we call it with [CrudClient->cmdL](../client/operations.md#cmdl) to benefit from the `limit` and `offset` [options](../services/options.md).

```typescript
const searchDto: SearchDto = {
    userNameLike: 'doe',
    visibility: 'public',
};
const options: ICrudOptions = {
    limit: 5,
}
const { data, total, limit } = await profileClient.cmdL(
    'search',
    searchDto,
    options
);
// results : [{ userName: "Michael Doe", ... }, { userName: "Jon Doe", ...}]
```
!!! note
    If no `limit` is specified, the client will perform multiple requests until `total` profiles have been fetched. The maximum `limit` that can be used is set in the [CmdSecurity](../configuration/limits.md#cmdsecurity).