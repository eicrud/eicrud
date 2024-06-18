Eicrud offers a variety of CRUD hooks to perform actions triggered by entity modification or query.

!!! note
    These hooks are specific to each [CRUDServices](./definition.md). For global hooks see the [controller hooks](../configuration/service.md#global-hooks).

## Create Hook

!!! warning
    If an error happens in a hook it will affect the operation, to avoid this:  

     - Don't `await` methods in your hook functions when possible, this way errors in hooks won't change the operation's result.
     - If you need to `await` something, surround it in a `try...catch` block and provide a fallback (unless you want the operation to cancel).
