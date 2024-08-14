Eicrud lets you split your [CrudServices](../services/definition.md) in microservices using a simple configuration.

```typescript title="eicrud.config.service.ts"
import { MicroServicesOptions } from '@eicrud/core/config';
import { microServices } from './eicrud.ms';

const msOptions = new MicroServicesOptions();

msOptions.username = '<your_mslink_user>';
msOptions.password = '<your_mslink_password>';

msOptions.microServices = microServices; 

@Injectable()
export class MyConfigService extends CrudConfigService {
    constructor(/* ... */) {
        super({ microServicesOptions: msOptions, /* ... */})
    }
    //..
}
```
```typescript title="eicrud.ms.ts"
export const microServices: Record<string, MicroServiceConfig>  = {
    "ms-A": {
        services: [User],
        openMsLink: true,
        openController: true,
        url: "http(s)://<ms_a_host>",
    },
    "ms-B": {
        services: [Store, Product],
        openMsLink: true,
        openController: true,
        url: "http(s)://<ms_b_host>",
    },
}
```

The environment variable `CRUD_CURRENT_MS` tells an application instance to behave as a particular ms. 

Your microservices call each other over the network using a ms-link endpoint. The routing depends on each service's `MicroServiceConfig`.

!!! note
    Check out [this guide](./dollar-functions.md) to make sure your application will behave the same once configured in microservices.

!!! warning
    MsLinks are protected by basic authentication (`msOptions.username` and `password`). Make sure to keep these credentials private since they allow total control over your application. Make sure your ms URLs start with `https` so that the credentials can't be sniffed over the network.

## Config

```typescript
export interface MicroServiceConfig {
    services: EntityClass<any>[],
    openMsLink: boolean,
    openController: boolean,
    proxyCrudController?: boolean,
    url: string,
    username?: string,
    password?: string,
    allowNonSecureUrl: boolean;
}
```

#### proxyCrudController

Tells your application instance to behave as a proxy and to directly forward requests to other microservices.

If the target of a request is present in its services list, the application will not proxy the request but will run the controls and implementation instead.

#### url
The url of the instance (where other microservices need to forward their requests).

#### allowNonSecureUrl

Allow the use of a non `https` url.
