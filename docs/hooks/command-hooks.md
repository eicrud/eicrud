---
description: provides offers controller hooks to perform actions triggered by commands.
---
Eicrud provides controller hooks to perform actions triggered by [commands](../services/commands.md).

!!! note 
    - In controllers hook you have access to the first [HttpRequest](../context.md) and last [HttpResponse](../context.md), this is useful in [microservices](../microservices/configuration.md) configuration where the pod executing the command is not always talking to the client directly.
    - These hooks are specific to each command. For global hooks see the [controller hooks](../configuration/service.md#global-hooks).

### beforeControllerHook
```typescript title="my_command.hooks.ts"
  async beforeControllerHook(
    dto: MyCommandDto,
    ctx: CrudContext,
  ): Promise<any> {
    // before my_command (entry controller)

    return dto;
  }
```
### afterControllerHook

```typescript title="my_command.hooks.ts"
  async afterControllerHook(
    dto: MyCommandDto,
    result: any,
    ctx: CrudContext,
  ): Promise<any> {
    // after my_command (entry controller)

    return result;
  }
```
### errorControllerHook
```typescript title="my_command.hooks.ts"
  async errorControllerHook(
    dto: MyCommandDto,
    error: any,
    ctx: CrudContext,
  ): Promise<any> {
    // on my_command error (entry controller)

    return Promise.resolve();
  }
```

!!! note 
    Returning a value in an error hook prevents the error from throwing. The value is sent back to the client.

