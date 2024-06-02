Eicrud provides various ways to control traffic to your application.


```typescript title="eicrud.config.service.ts"
const watchTrafficOptions = {
  ddosProtection: false,
  useForwardedIp: false,
  IP_REQUEST_THRESHOLD: 700,
  MAX_TRACKED_IPS: 10000,
  
  userTrafficProtection: true,
  USER_REQUEST_THRESHOLD: 350,
  MAX_TRACKED_USERS: 10000,
  TIMEOUT_THRESHOLD_TOTAL: 5,

  TIMEOUT_DURATION_MIN: 15,

  userTrafficCache: null;
  ipTrafficCache: null;
  ipTimeoutCache: null;
}

@Injectable()
export class MyConfigService extends CrudConfigService {
    constructor(/* ... */) {
        super({ watchTrafficOptions, /* ... */})
    }
    //..
}
```

### Watch user traffic

Activate with `userTrafficProtection` (defaults to `true`).

Limit user traffic to `USER_REQUEST_THRESHOLD` request every 5 min. Exceeding that limit will trigger an incident ([onHighTrafficEvent](./config-service.md#events)).

!!! note
    Traffic incidents lower the user's [trust score](../user/definition.md#trust). 

After `TIMEOUT_THRESHOLD_TOTAL` incidents, the user will be timed out for `TIMEOUT_DURATION_MIN` * `user.timeoutCount` on each consecutive incident.

If you want a specific user to bypass these limits, you can set `user.allowedTrafficMultiplier` to **x** (is allowed the traffic of **x** users).

`MAX_TRACKED_USERS` indicates how many users your application will track in its RAM cache (users with lower traffic are deleted first). 


### DDOS Protection

Activate with `ddosProtection` (defaults to `false`).

After exceeding `IP_REQUEST_THRESHOLD` requests in 5 minutes, IP will be timed out for `TIMEOUT_DURATION_MIN`.

`MAX_TRACKED_IPS` indicates how many IPs your application will track in its RAM cache (IPs with lower traffic are deleted first).

`useForwardedIp` indicates if the value from the `x-forwarded-for` header should be used instead of the request IP.

!!! warning 
    If your application is behind a reverse proxy or a load balancer, all incoming requests will have the same IP address. To avoid any issues make sure to set the `x-forwarded-for` header in your proxy and to use the `useForwardedIp` option.

!!! note
    Some internet provider may group their client under common IPs, leading to false positives. You should consider other DDOS protection services as your application grows. This protection is rudimentary and only suitable for low-traffic applications.


### Distributed Cache
Tracked users and IPs are cached on RAM by default. You can use a distributed cache of your choice by setting `userTrafficCache`, `ipTrafficCache` and `ipTimeoutCache`.

The caches must implement the `TrafficCache` interface.

```typescript
export interface TrafficCache {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<any>;
  inc: (key: string, increment: number, currentValue: number) => Promise<any>;
}
```

`userTrafficCache` and `ipTrafficCache` must clear themselves every 5 min.

!!! note
     If your application's [entry](../microservices/configuration.md) consists of multiple instances, caching in RAM will make traffic protections ineffective. Consider using a distributed cache to make it work.
