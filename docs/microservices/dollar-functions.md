 In a CrudService any function starting with `$` may be replaced by an HTTP call, depending on your `msOptions`. 

 For example with the following configuration :

```typescript
msOptions.microServices = {
  "ms-A": {
    services: [MyUser],
    openBackDoor: true, openController: true,
    url: "http://localhost:3005",
  },
  "ms-B": {
    services: [Profile],
    openBackDoor: true, openController: true,
    url: "http://localhost:3006",
  },
}
```

- Calling `myUserService.$find` on **ms-A** will directly run the function implementation.

- Calling `myUserService.$find` on **ms-B** will perform an HTTP request to **ms-A** (passing the arguments), then the function implementation will be run, and the result returned to **ms-B**.

This means you must be careful when defining `$` functions inside your CrudServices since the behavior of the function might change depending on where it is called. 

**Here are a few guidelines that will make your transition from monolithic to microservices a breeze.**

## Treat all functions as async

Make sure to treat all `$` functions as `async` and to `await` them if needed.

```typescript
// in your CrudService
$methodA(a, b){
  return a + b;
}
```
```typescript
// somewhere else
const res = myUserService.$methodA(2, 2);

console.log(res)
```

The above code will display `4` on **ms-A** but display `[object Promise]` on **ms-B**.  

`$` functions should always be defined async:
```typescript
async $methodA(a, b){
  return a + b;
}
```
```typescript
const res = await myUserService.$methodA(2, 2);
```

## Ensure arguments and return value can be serialized

In javascript, **functions** are not serialized, for example:

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

console.log(res())
```
The above code will display `5` on **ms-A**, but throw an error on **ms-B**.
!!! failure   
    `Error: res is not a function`

Additionally, passing or returning **circular references** will throw an error:

```typescript
const objA = { };

const objB = { objA: objA }

objA['objB'] = objB

await myUserService.$methodB(objA);
```
On **ms-B**, the above code will throw.
!!! failure   
    `Error: Converting circular structure to JSON`


You can call `JSON.stringify(obj)` to test what can and can't be serialized. **Note that passing very large objects will impact your performance when switching to microservices.**

## Always return by value

Since arguments are not returned by the HTTP method. Any "return by reference" logic will stop working if called from another ms.

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

console.log(obj.value)
```
The above code will display `2` on **ms-A** but display `1` on **ms-B**.

You can return the `obj` to make it work on both ms:
```typescript
// in your CrudService
$methodC(obj){
  obj.value++;
  return obj;
}
```
```typescript
// somewhere else
let obj = { value: 1 };

obj = await myUserService.$methodC(obj);

console.log(obj.value)
```

## Naming your arguments

Argument name `ctx` is reserved in `$` function, and should only be used to pass the [CrudContext](../context.md).

!!! note
    You might want to pass the [CrudContext](../context.md) to every `$` function to enable reliable logging in backdoor [hooks](../configuration/config-service.md#hooks).
