---
description: A practical guide to make sure your Eicrud application will function in a microservices configuration.
comments: true
---
 
 In a [CrudService](../services/definition.md) any function starting with `$` may be replaced by an HTTP call, depending on your `msOptions`. 

 For example with the following configuration :

```typescript
msOptions.microServices = {
  "ms-A": {
    services: [MyUser],
    openMsLink: true, openController: true,
    url: "http://localhost:3005",
  },
  "ms-B": {
    services: [Profile],
    openMsLink: true, openController: true,
    url: "http://localhost:3006",
  },
}
```

- Calling `myUserService.$find` on **ms-A** will directly run the function implementation.

- Calling `myUserService.$find` on **ms-B** will perform an HTTP request to **ms-A** (passing the arguments), then the function implementation will be run, and the result returned to **ms-B**.

To ensure consistency between monolithic and microservices configurations, all `$` functions have their arguments and return values automatically stringified with `JSON.stringify()` and then parsed with `JSON.parse()`. This ensures that the behavior remains identical whether the function is called locally or over HTTP.

**Here are the guidelines for working with `$` functions:**

## Treat all functions as async

All `$` functions should be treated as `async` and must be `await`ed when called.

```typescript
// in your CrudService
async $methodA(a, b){
  return a + b;
}
```
```typescript
// somewhere else
const res = await myUserService.$methodA(2, 2);
console.log(res) // displays 4
```

## Ensure arguments and return value can be serialized

Since all `$` function arguments and return values go through JSON serialization, certain JavaScript types cannot be passed or returned.

**Functions** are not serialized:

```typescript
// in your CrudService
async $methodB(fun){
  return fun;
}
```
```typescript
// somewhere else
const fun = () => return 5;

const res = await myUserService.$methodB(fun);

console.log(res()) // Error: res is not a function
```

**Circular references** will throw an error:

```typescript
const objA = { };
const objB = { objA: objA }
objA['objB'] = objB

await myUserService.$methodB(objA); // Error: Converting circular structure to JSON
```

You can call `JSON.stringify(obj)` to test what can and can't be serialized. **Note that passing very large objects will impact performance.**

## Always return by value

Since arguments go through JSON serialization, any "return by reference" logic will not work. Objects are always passed and returned by value.

```typescript
// in your CrudService
async $methodC(obj){
  obj.value++;
}
```
```typescript
// somewhere else
const obj = { value: 1 };

const res = await myUserService.$methodC(obj);

console.log(obj.value) // displays 1 (unchanged)
```

You must return the `obj` to get the modified value:
```typescript
// in your CrudService
async $methodC(obj){
  obj.value++;
  return obj;
}
```
```typescript
// somewhere else
let obj = { value: 1 };

obj = await myUserService.$methodC(obj);

console.log(obj.value) // displays 2
```

## Context propagation

Argument name `ctx` is reserved in `$` functions and should only be used to pass the [CrudContext](../context.md).

If you want to propagate parameters from the context back to the caller, you can use the following context properties:

```typescript
ctx.store_bidirectional?: Record<string, any>;
ctx.setCookies?: Record<string, CookieToSet>;
```

These properties are sent back even with HTTP requests, allowing bidirectional communication between services.

!!! note
    You should pass the [CrudContext](../context.md) to every `$` function to enable reliable logging in ms-link [hooks](../configuration/service.md#hooks).

## Optimization with `$$` functions

When appropriate, you can call the `$$` (runtime created function) that does not stringify/serialize arguments and output for better performance:

```typescript
// Example with proper typing
(this['$$someMethod'] as typeof this.$someMethod)(query, ctx)
```

!!! info "Safe usage of `$$` functions"
    It is safe to use `$$` functions when inside another `$` function and only when calling direct `this.$` methods (not `this.otherService.$`). This ensures consistent behavior since in these cases the calling context and the function implementation are always on the same microservice.
