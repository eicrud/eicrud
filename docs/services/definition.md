Services are the main components of your Eicrud application. They host a CRUD entity as well as CMDs for non-crud operations.

## Generate a new service

You can use the [CLI](){:target="_blank"} to quickly generate a new service.

```
eicrud generate service profile
```

An Eicrud service (CrudService) has 3 main components:

### An [Entity]():

```typescript title="services/profile/profile.entity.ts"
@Entity()
export default class Profile implements CrudEntity {

    @PrimaryKey({ name: '_id' })
    @IsString()
    @IsOptional()
    id: string;

    @Property()
    createdAt: Date;

    @Property()
    updatedAt: Date;

}
```
It is the database schema as well as the DTO for CRUD operations. In that case, a `profile` table is created.

### A [Security]():
```typescript title="services/profile/profile.security.ts"
export function getSecurity(PROFILE: string): CrudSecurity { 
    return {
        rolesRights: {
            guest: {
                async defineCRUDAbility(can, cannot, ctx) {
                    //rules for guests

                }
            }
        },
    }
}
```
This is where you define the access rules for your entity. By default, nothing is allowed unless specified in the security.

### A [Service]():
```typescript title="services/profile/profile.service.ts"
@Injectable()
export class ProfileService extends CrudService<Profile> {
    constructor(protected modRef: ModuleRef) {
        const serviceName = CrudService.getName(Profile);
        super(modRef, Profile, getSecurity(serviceName));
    }
}
```
The actual service implementation, it's a [NestJS provider](https://docs.nestjs.com/providers){:target="_blank"} that you can use everywhere in your app. This is where the service's configuration is specified. 

!!! info

    In a CrudService any function starting with `$` may be replaced by an HTTP call, depending on your [microservices]() configuration. 
    
    You should always: 
    
    - `await` the result of `$` functions
    - pass parameters that can be serialized
    - return values that can be serialized 
    
     Check out [this guide](../microservices/dollar-functions.md) to ensure your application can smoothly transition from monolithic to microservices.


## Operations

A CrudService handles all CRUD operations out of the box :  

  - **Create**: [$create](./operations.md#create-operations), [$createBatch](./operations.md#create-operations)
  - **Read**: [$findOne](./operations.md#read-operations), [$find](./operations.md#read-operations), [$findIn](./operations.md#read-operations)
  - **Update**: [$patchOne](./operations.md#update-operations), [$patch](./operations.md#update-operations), [$patchIn](./operations.md#update-operations), [$patchBatch](./operations.md#update-operations)
  - **Delete**: [$removeOne](./operations.md#delete-operations), [$remove](./operations.md#delete-operations), [$removeIn](./operations.md#delete-operations)

You can extend it with [CMDs](commands.md) for everything else.

## Import your service
Since services are [NestJS providers](https://docs.nestjs.com/providers){:target="_blank"}, you can inject them anywhere in your app:

```typescript
@Injectable()
export class UserService extends CrudUserService<User> {
    constructor(
        protected modRef: ModuleRef,
        protected profileService: ProfileService 
    ) {
        super(modRef, User, userSecurity(CrudService.getName(User)));
    }

    async findProfile(query){
        return await this.profileService.$find(query);
    }
}
```