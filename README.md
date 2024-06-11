<img height="80" width="80" src="./docs/planet.svg">

**Eicrud** is CRUD/Authorization framework extending [NestJS](https://github.com/nestjs/nest). It works with [MikroOrm](https://mikro-orm.io/) entities guarded with [CASL](https://casl.js.org) and [class-validator](https://github.com/typestack/class-validator).

## How it works

First, define your entity with validations and transforms (what the data can be) :

```typescript
@Entity()
export class Profile {
  @PrimaryKey()
  @IsString()
  @IsOptional()
  id: string;

  @OneToOne(() => MyUser, (user) => user.profile)
  @IsString()
  owner: MyUser | string;

  @Property()
  @$Transform((val) => val.toLowerCase())
  @MaxLength(30)
  userName: string;
}
```

Then define your security (who can access the data):

```typescript
const security: CrudSecurity = {
  user: {
    async defineCRUDAbility(can, cannot, ctx) {
      const id = ctx.userId;
      // users can crud their own profile
      can('crud', 'profile', { owner: id });
    },
  },
  guest: {
    async defineCRUDAbility(can, cannot, ctx) {
      // guests can read all profiles
      can('read', 'profile');
    },
  },
};
```

Finally, register your service :

```typescript
@Injectable()
export class ProfileService extends CrudService<Profile> {
  constructor(protected moduleRef: ModuleRef) {
    super(moduleRef, Profile, security);
  }
}
```

And **that's it**, `profile` is now a fully operational CRUD service that you can query with the [client](#client) :

```typescript
const client = new CrudClient({ serviceName: 'profile' });

const res = await client.findOne({ userName: 'jon doe' });
```

You can extend it using [commands](https://docs.eicrud.com/services/commands/) (for non-CRUD operations).

## Monolithic/Microservices duality

Eicrud lets you group your CRUD services into "microservices" with a simple configuration. You can start developing a monolith and easily switch to microservices later on.

```typescript
  "entry": {
    services: [],
    openBackDoor: false, openController: true,
    url: "http://localhost:3004",
  },
  "users": {
    services: [User, Profile],
    openBackDoor: true, openController: false,
    url: "http://localhost:3005",
  },
  "orders": {
    services: [Order],
    openBackDoor: true, openController: false,
    url: "http://localhost:3006",
  },
}
```

## Features

- Out of the box CRUD Services
  - No need to write controllers
  - Extensible using CMDs
- Authorization
  - Secure by default (all operations are forbidden until allowed)
  - Based on roles with inheritance
- Authentication
  - JWT based
  - Bruteforce protection
  - Timeout system (ban)
  - Session kick
  - Extensible for 3rd party auth
- Validation/Transform
  - Entities are DTOs
  - CMDs have their DTOs
  - Custom $Transform decorators
- Database Control
  - Max entities per user
  - Max entities in db
  - Object size is always validated
- Easy to use Client
  - Handle login and session
  - Handle expired JWT (disconnect)
  - Handle limited results (auto-fetching)
- Monolithic/Microservices structure
  - Group your CRUD services into microservices
  - Simple (dynamic) configuration
  - Application can be both monolithic and distributed
- And more!
  - Rate limiting
  - DDOS protection
  - ...

Check out the [documentation](https://docs.eicrud.com/installation) to get started.
