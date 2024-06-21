Eicrud provides batching options to help split large [DTO](../validation/definition.md) arrays into smaller batches. This functionality can smooth the impact of commands on your infrastructure and prevent potential issues with requests being too large.

## Create a batchable command

Start by generating a new cmd using the [CLI](https://www.npmjs.com/package/@eicrud/cli){:target="_blank"}.

```shell
eicrud generate cmd profile migrate
```

Let's change the [DTO](../validation/definition.md) to accept an array of IDs. In this example let's assume complex operations are performed on the provided IDs and that this array can be very large.

```typescript title="migrate.dto.ts"
export class MigrateDto {
  @IsString({ each: true })
  @MaxLength(30, {each: true})
  @$MaxSize(-1)
  profileIds: string[];

  @IsString()
  direction: 'up' | 'down';
}
```

Then, let's allow admins to use the migrate command in the security. We also specify the `batchField` and the `maxBatchSize` an admin can perform.
```typescript title="search.security.ts"
const getCmdSecurity = (migrate, profile): CmdSecurity => { 
    return {
        batchField: 'profileIds',
        dto: MigrateDto,
        rolesRights: {
            admin: {
                maxBatchSize: '250',
                async defineCMDAbility(can, cannot, ctx) {
                    // Define abilities for guest
                    can(migrate, profile);
                }
            }
        },
    }
}
```

!!! note
    DTO's `$MaxSize(-1)` is important to prevent the validation of the `profileIds` array size which is already handled by `maxBatchSize`. Alternatively you can use `@$MaxArLength(-1)` combined with `@$Type()`. See [Eicrud's decorators](../validation/definition.md#eicrud-decorators).

## Implementation

Let's implement the command action.

```typescript title="migrate.action.ts"
export default async function migrate(dto: MigrateDto, service: ProfileService, ctx: CrudContext, inheritance?: any ){
    const ids = dto.profileIds;
    let result;
    if(dto.direction === 'up'){
        /*
            Perform the migration 
        */
    }else{
        /*
            Revert the migration 
        */
    }

    return result;
}
```


## Usage

Finally, call your command from the [client](../client/setup.md). It will automatically split your `profileIds` fields in batches and perform multiple requests if needed.

```typescript
    profileClient.config.cmdDefaultBatchMap = {
      'migrate': { batchField: 'profileIds', batchSize: 250 },
    };

    const migrateDto: MigrateDto = {
        profileIds: ['6592008029c8c3e4dc76256c', '507f191e810c19729de860ea', /* ... */ ],
        direction: 'up';
    };

    const res = await profileClient.cmd(
      'migrate',
      migrateDto,
    );
```

!!! note
    The client merges the results into a single array.

!!! info
    The client automatically detects if the server `maxBatchSize` is exceeded and reduce it accordingly. In this example, this means you don't have to worry about other roles having a `maxBatchSize` lower than 250. However, it's still important to specify a `batchSize` in the client, since a request with a payload too large might crash.