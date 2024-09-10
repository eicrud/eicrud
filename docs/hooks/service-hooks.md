---
description: Eicrud offers a variety of CRUD hooks to perform actions triggered by entity modification or query.
---
Eicrud offers a variety of CRUD hooks to perform actions triggered by entity modification or query.

!!! note
    These hooks are specific to each [CRUDServices](../services/definition.md). For global hooks see the [controller hooks](../configuration/service.md#global-hooks).

!!! warning
    Any error thrown in a hook cancels the underlying operation. Consider using `try...catch` blocks to avoid side effects.

!!! note 
    Returning a value in an error hook prevents the error from throwing. The value is sent back to the client.

## Create Hooks

### beforeCreateHook

```typescript title="user.hooks.ts"
override async beforeCreateHook(this: UserService, data: User[], ctx) {
    // before User creation

    return data;
}
```

### afterCreateHook
```typescript title="user.hooks.ts"
override async afterCreateHook(this: UserService, result: any[], data: User[], ctx) {
    // after User creation

    return result;
}
```


### errorCreateHook

```typescript title="user.hooks.ts"
override async errorCreateHook(this: UserService, data: User[], ctx: CrudContext, error: any) {
    // error User creation

    return null;
}
```



## Read hooks

### beforeReadHook
```typescript title="user.hooks.ts"
override async beforeReadHook(this: UserService, query: User, ctx){
    // before User read

    return query;
}
```

### afterReadHook
```typescript title="user.hooks.ts"
override async afterReadHook(this: UserService, result, query: User, ctx){
    // after User read

    return result;
}
```

### errorReadHook
```typescript title="user.hooks.ts"
override async errorReadHook(this: UserService, query: User, ctx: CrudContext, error: any) {
    // error User read

    return null;
}
```

## Update Hooks

### beforeUpdateHook

```typescript title="user.hooks.ts"
override async beforeUpdateHook(this: UserService,
    updates: { query: User; data: User }[],
    ctx
) {
    // before User update

    return updates;
}
```

### afterUpdateHook

```typescript title="user.hooks.ts"
override async afterUpdateHook(this: UserService, 
    results: any[],
    updates: { query: User; data: User }[],
    ctx,
) {
    // after User update

    return results;
}
```

### errorUpdateHook

```typescript title="user.hooks.ts"
override async errorUpdateHook(this: UserService, 
    updates: { query: User; data: User }[],
    ctx: CrudContext,
    error: any,
) {
    // error User update

    return null;
}
```

## Delete Hooks

### beforeDeleteHook

```typescript title="user.hooks.ts"
override async beforeDeleteHook(this: UserService, query: User, ctx: CrudContext){
        // before User delete

        return query;
}
```

### afterDeleteHook
```typescript title="user.hooks.ts"
override async afterDeleteHook(this: UserService, result, query: User, ctx: CrudContext){
        // after User delete

        return result;
}
```

### errorDeleteHook
```typescript title="user.hooks.ts"
override async errorDeleteHook(this: UserService, query: User, ctx: CrudContext, error: any){
    // error User delete

    return null;
}
```

## Error Hook

```typescript title="user.hooks.ts"
override async errorControllerHook(this: UserService, error: any, ctx: CrudContext){
        //after User error

}
```

!!! note 
    Error hooks are called by the controller and not the [service](../services/definition.md). This means they'll only catch errors that result from a controller call.


