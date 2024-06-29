<p align="center">
  <img width="200" src="https://raw.githubusercontent.com/eicrud/eicrud/develop/docs/planet.svg" alt="@eicrud/eicrud logo">
</p>
<p align="center">
  <a href="https://npmjs.com/package/@eicrud/core" target="_blank"><img src="https://img.shields.io/npm/v/%40eicrud%2Fcore?color=%232AAA8A%09" alt="npm package"></a>
  <a href="https://npmjs.com/package/@eicrud/core" target="_blank"><img src="https://img.shields.io/npm/dw/%40eicrud%2Fcore.svg" alt="downloads"></a>
  <a href="https://npmjs.com/package/@eicrud/core" target="_blank"><img alt="NPM Unpacked Size" src="https://img.shields.io/npm/unpacked-size/%40eicrud%2Fcore"></a>
  <a href="https://docs.eicrud.com" target="_blank"><img alt="Static Badge" src="https://img.shields.io/badge/Documentation-purple"></a>
  <a href="https://x.com/eicrud" target="_blank"><img alt="X (formerly Twitter) Follow" src="https://img.shields.io/twitter/follow/eicrud"></a>
</p>
<p align="center"><b>Eicrud</b> is CRUD/Authorization framework extending <a href="https://github.com/nestjs/nest" target="_blank">NestJS</a>.<br/> It's a tool for building scalable, secure <a href="https://nodejs.org" target="_blank">Node.js</a> server applications in record time.</p>

## Philosophy

Most of the time, a web app has some CRUD functionality as its base. Eicrud attempts to abstract this into a simple and easy-to-use API, so you don't have to re-write boilerplate code (controllers, validations, db queries...) every time you need a new service. By centering everything around CRUD entities, Eicrud provides a framework for writing complex applications that are easy to read, test and maintain. Eicrud also emphasizes "default security" for its components, where everything is forbidden until allowed.

## How it works

Under the hood, **Eicrud** uses [MikroOrm](https://mikro-orm.io/) entities guarded with [CASL](https://casl.js.org) and [class-validator](https://github.com/typestack/class-validator).

### Here's a quick example 
You first define your entity with validations and transforms (what the data can be).

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

Then define your security (who can access the data).

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

And finally, register your service.

```typescript
@Injectable()
export class ProfileService extends CrudService<Profile> {
  constructor(protected moduleRef: ModuleRef) {
    super(moduleRef, Profile, security);
  }
}
```

**That's it**, `profile` is now a fully operational CRUD service that you can query with the [client](https://docs.eicrud.com/client/setup/).

```typescript
const client = new CrudClient({ serviceName: 'profile' });

const res = await client.findOne({ userName: 'jon doe' });
```

You can extend it using [commands](https://docs.eicrud.com/services/commands/) (for non-CRUD operations).

## Monolithic/Microservices duality

**Eicrud** lets you group your CRUD services into "microservices" with a simple configuration. You can start developing a monolith and easily switch to microservices later on.

```typescript
msOptions.microServices = {
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
