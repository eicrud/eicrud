---
description: You can generate a super-client with Eicrud's CLI, it comes with all your DTO/Entity types and provides powerful autocompletion to find your services/commands.
---

You can generate a **super-client** with Eicrud's [CLI](https://www.npmjs.com/package/@eicrud/cli){:target="_blank"}, it comes with all your DTO/Entity types and provides powerful autocompletion to find your services and commands.

## How to export the super-client

Generating the super-client is a two-step process. 
```bash
eicrud export dtos
```
This command copies all your `.dto.ts` and `.entity.ts` to the `eicrud_exports` directory and strips them of their decorators.
```bash
eicrud export superclient
```
This command builds a typed class for each of your CRUD services and instantiates them in a main `SuperClient` class.
```typescript title="eicrud_exports/super_client.ts"
import { ProfileClient } from './user-profile/user-profile.client';
import { UserClient } from './my-user/my-user.client';
import { SuperClientConfig } from "@eicrud/client";

export class SuperClient {

    constructor(config: SuperClientConfig) {
        // GENERATED START 1
        this.profile = new ProfileClient(config);
        this.user = new UserClient(config);
    }

    // GENERATED START 2
    profile: ProfileClient;
    user: UserClient;
}
```
At this point, all you need to do is copy the `eicrud_exports` directory and you can enjoy the `SuperClient`'s autocompletion into your front-end or anywhere else.

```typescript
import { SuperClient } from "./eicrud_exports/super_client";
import { Profile } from "./eicrud_exports/profile/user-profile.entity";

const sp = new SuperClient({url: 'http://localhost:3000'});

// Get typing tailored to your service's entity
const profile: Profile = await sp.profile.findOne({userName: "Jon Doe"});

// Directly call your profile's $say_hello command
const helloWorld = await sp.profile.say_hello({arg: 'world'});

```

## Exclude files from the export