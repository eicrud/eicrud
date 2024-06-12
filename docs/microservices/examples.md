
Here are a few examples of microservice configurations.


## API Gateway
```typescript title="eicrud.ms.ts"
export const microServices: Record<string, MicroServiceConfig>  = {
    "entry": {
        services: [],
        openBackDoor: false,
        openController: true,
        url: "http(s)://<entry_ms_host>",
    },
    "user": {
        services: [User],
        openBackDoor: true,
        openController: false,
        url: "http(s)://<user_ms_host>",
    },
    "store": {
        services: [Store, Product],
        openBackDoor: true,
        openController: false,
        url: "http(s)://<store_ms_host>",
    },
}
```
In this configuration Authentication, [Authorization](../security/definition.md) and [Rate Limiting](../configuration/limits.md) are performed on the `entry` ms.

Then requests are forwarded to the different ms depending on what service is called.

!!! note
    `user` and `store` can communicate with each other via their backdoor, they won't listen to external requests since their controller is closed.

## Auth Performance
```typescript title="eicrud.ms.ts"
export const microServices: Record<string, MicroServiceConfig>  = {
    "entry": {
        services: [User],
        openBackDoor: true,
        openController: true,
        url: "http(s)://<entry_ms_host>",
    },
    "store": {
        services: [Store],
        openBackDoor: true,
        openController: false,
        url: "http(s)://<store_ms_host>",
    },
    "product": {
        services: [Product],
        openBackDoor: true,
        openController: false,
        url: "http(s)://<product_ms_host>",
    },
}
```
This configuration puts the `UserService` into the `entry` ms. Along with [caching users in RAM](../services/cache.md), this allows for great performance since the users will be fetched from the pod memory. 

It can work with multiple `entry` pods if you put a load balancer with an IP-hashing strategy in front of it.

!!! note
    This configuration leaves your backdoor exposed to the internet, you might want to use a reverse proxy that blocks requests to `/crud/backdoor/*` coming from outside your network.

## Maximum Distribution
```typescript title="eicrud.ms.ts"
export const microServices: Record<string, MicroServiceConfig>  = {
    "entry": {
        services: [],
        openBackDoor: false,
        openController: true,
        url: "http(s)://<entry_ms_host>",
        proxyCrudController: true,
    },
    "store": {
        services: [Store],
        openBackDoor: true,
        openController: true,
        url: "http(s)://<store_ms_host>",
    },
    "product": {
        services: [Product],
        openBackDoor: true,
        openController: true,
        url: "http(s)://<product_ms_host>",
    },    
    "user": {
        services: [User],
        openBackDoor: true,
        openController: true,
        url: "http(s)://<user_ms_host>",
    },
}
```
In this configuration, the `entry` acts as a simple proxy, requests are forwarded to the microservices' controllers.

!!! note
    In this configuration, no checking is performed on the `entry`. Each ms performs its own validation, authentication, authorization and [limiting](../configuration/traffic.md).