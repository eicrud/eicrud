

**Eicrud** is CRUD/Authorization framework meant to extend a [Nestjs](https://github.com/nestjs/nest) application. It is works with [MikroOrm](https://mikro-orm.io/) entities  guarded with [CASL](https://casl.js.org) and [class-validator](https://github.com/typestack/class-validator).


## How it works

First define your entity with validations and transforms (what the data can be) :

```typescript
@Entity()
export class Profile {
    @PrimaryKey()
    @IsString()
    @IsOptional()
    id: string;

    @OneToOne(() => MyUser, user => user.profile)
    @IsString()
    owner: MyUser | string;

    @Property()
    @$Transform((val) => val.toLowerCase())
    @MaxLength(30)
    userName: string;
}
```

Then define your security (who can access the data) :

```typescript
const security: CrudSecurity = {
  user: {
    defineCRUDAbility(can, cannot, ctx) {
      const id = ctx.userId;
      // users can crud their own profile  
      can('crud', 'profile', { owner: id });
    }
  },
  guest: {
    defineCRUDAbility(can, cannot, ctx) {
      // guests can read all profiles
      can('read', 'profile')
    }
  }
}
```

Finally register your [Nestjs](https://github.com/nestjs/nest) service :

```typescript
@Injectable()
export class ProfileService extends CrudService<Profile> {
    constructor(protected moduleRef: ModuleRef) {
        super(moduleRef, Profile, security);
    }
}
```

And **that's it**, `profile` is now a fully operational CRUD service than you can query with the [client](#client) :
```typescript
const client = new CrudClient({serviceName: 'profile'})

const res = await client.findOne({ userName: 'jon doe' })
```

You can extends it using [commands](#commands) (for complex operations).

## Features
- Out of the box CRUD Services
    * No need to write controllers
    * Extensible using CMDs
- Authorization
    * Secure by default (all operations are forbidden until allowed)
    * Based on roles with inheritance
- Authentification
    * JWT based
    * Bruteforce protection
    * Password hashing
    * Timeout system (ban)
    * Session kick
    * Extensible for 3rd party auth
- Validation/Transform
    * Entities are DTOs
    * CMDs have their own DTOs
    * Custom $Transform decorators
- Database Control
    * Max entities per user
    * Max entities in db
    * Object size is always validated
- Easy to use Client
    * Handle login and session
    * Handle expired jwt (disconnect)
    * Handle limited results (auto-fetching)
- Monolitic/Microservices structure
    * Simple (dynamic) configuration
    * Group your CRUD services into microservices
    * Application can be both monolitic and distributed
- And more!
    * Rate limiting
    * DDOS protection
    * ...
