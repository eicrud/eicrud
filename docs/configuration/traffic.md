---
description: Eicrud provides various ways to limit traffic to your application. Here are the options.
comments: true
---

Eicrud provides various ways to limit traffic to your application.

```typescript
export class WatchTrafficOptions{
  maxTrackedUsers: number = 10000;
  maxTrackedIPs: number = 10000;
  userRequestsThreshold: number = 350;
  ipRequestsThreshold: number = 700;
  totalTimeoutThreshold: number = 5;
  timeoutDurationMinutes: number = 15;
  useForwardedIp: boolean = false;
  ddosProtection: boolean = false;
  userTrafficProtection: boolean = true;

  userTrafficCache: TrafficCache = null;
  ipTrafficCache: TrafficCache = null;
  ipTimeoutCache: TrafficCache = null;
}
```
```typescript title="eicrud.config.service.ts"
import { WatchTrafficOptions } from '@eicrud/core/authentication'

const watchTrafficOptions = new WatchTrafficOptions();

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

Limit user traffic to `userRequestsThreshold` request every 5 min. Exceeding that limit will trigger an incident ([onHighTrafficEvent](./service.md#events)).

!!! note
    Traffic incidents lower the user's [trust score](../user/definition.md#trust). 

After `totalTimeoutThreshold` incidents, the user will be timed out for `timeoutDurationMinutes` * `user.timeoutCount` on each consecutive incident.

If you want a specific user to bypass these limits, you can set [CrudRole](../security/roles.md)->`allowedTrafficMultiplier` to **x** (is allowed the traffic of **x** users).

`maxTrackedUsers` indicates how many users your application will track in its RAM cache (users with lower traffic are deleted first). 


### DDOS Protection

Activate with `ddosProtection` (defaults to `false`).

After exceeding `ipRequestsThreshold` requests in 5 minutes, IP will be timed out for `timeoutDurationMinutes`.

`maxTrackedIPs` indicates how many IPs your application will track in its RAM cache (IPs with lower traffic are deleted first).

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
