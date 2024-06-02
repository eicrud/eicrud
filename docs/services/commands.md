Commands are user-defined functions attached to a service.

## Generate a new command

You can use the [CLI](){:target="_blank"} to quickly generate a new command.

```
eicrud generate cmd profile sayHello
```

Like [services](/services/definition), CMDs have 3 main components:

### A Dto

```typescript title="services/profile/cmds/say_hello/say_hello.dto.ts"
export default class SayHelloDto {

    @IsString()
    @IsOptional()
    arg: string;

}
```

Command DTOs follow the same [validation](/services/validation)/[transform](/services/transform) rules as [entities](/services/entity).

### A [Security](/services/security)

```typescript title="services/profile/cmds/say_hello/say_hello.security.ts"
const getCmdSecurity = (SAYHELLO, PROFILE): CmdSecurity => { 
    return {
        dto: SayHelloDto,
        rolesRights: {
            user: {
                async defineCMDAbility(can, cannot, ctx) {
                    // Define abilities for user

                }
            }
        },
    }
}
```
This is where you define the access rules for your CMD. Like service security, nothing is allowed unless specified.

Ability syntax is `can(<cmd_name>, <service_name>, ...args)`, for example:
```typescript
async defineCMDAbility(can, cannot, ctx) {
    can(SAYHELLO, PROFILE) //User can call sayhello on service profile
}
```

### An Action
```typescript title="services/profile/cmds/sayhello/sayhello.action.ts"
export default function say_hello(dto: SayHelloDto, service: ProfileService, ctx: CrudContext, inheritance?: any ){
    return `Hello ${dto.arg}!`
}
```
This is the CMD implementation. Any value returned is sent to the client.

Eicrud's controller will route to your implementation via your CrudService (`'$' + <cmd_name>`):
```typescript title="services/profile/profile.service.ts"
    async $say_hello(dto: Say_helloCmdDto, ctx: CrudContext, inheritance?: any) {
       return await serviceCmds.say_hello.action(dto, this, ctx, inheritance);
    }
```
## Call your command

You can call your command from the [client]():
```typescript 
const dto = { arg: 'world'};
const res = await profileClient.cmd('say_hello', dto);
console.log(res) // Hello world!
```
!!! note
    Dashes (`-`) found in cmd names are replaced by underscores (`_`) by the CLI

Or you can call your CMD from another service:
```typescript 
const dto = { arg: 'world'};
const res = await profileService.$say_hello(dto, null);
console.log(res) // Hello world!
```

!!! info
    `$` functions should always be treated as async, check out [this guide](/microservices/dollar-functions) to learn more.