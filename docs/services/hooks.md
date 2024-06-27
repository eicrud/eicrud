Eicrud offers a variety of CRUD hooks to perform actions triggered by entity modification or query.

!!! note
    These hooks are specific to each [CRUDServices](./definition.md). For global hooks see the [controller hooks](../configuration/service.md#global-hooks).

!!! warning
    Any error thrown in a hook cancels the underlying operation. Consider using `try...catch` blocks to avoid side effects.
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


## Error Hook

```typescript title="user.hooks.ts"
override async errorControllerHook(this: UserService, error: any, ctx: CrudContext){
        //after User error

}
```

!!! note 
    Error hooks are called by the controller and not the [service](./definition.md). This means they'll only catch errors that result from a controller call. Returning a value in an error hook prevents the error from throwing. The value is sent back to the client.


