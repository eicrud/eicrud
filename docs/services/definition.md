Services are the main components of your Eicrud application. They host a basic CRUD entity as well as CMDs for non-crud operations.

## Generate a new service

You can use the [CLI](){:target="_blank"} to quickly generate a new service.

```
eicrud generate service profile
```

An Eicrud service (CrudService) has 3 main components:

### [Entity]()

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
It is the database schema as well as the DTO for CRUD operations. In that case, a `profile` table is automatically created.

### [Security]()
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

### [Service]()
```typescript title="services/profile/profile.service.ts"
@Injectable()
export class ProfileService extends CrudService<Profile> {
    constructor(protected modRef: ModuleRef) {
        const serviceName = CrudService.getName(Profile);
        super(modRef, Profile, getSecurity(serviceName));
    }
}
```
The actual service implementation, it's a [NestJS provider](https://docs.nestjs.com/providers) that you can use everywhere in your app. This is where the service's configuration is specified. 

!!! info

    In a CrudService any function starting with `$` may be replaced by an HTTP call, depending on your [microservices]() configuration. 
    
    You should always: 
    
    - `await` the result of `$` functions
    - pass parameters that can be serialized
    - return values that can be serialized 
    
     Check out [this guide](/microservices/dollar-functions) to ensure your application can smoothly transition from monolithic to microservices.


## Operations

A CrudService handles all CRUD operations out of the box :  

  - **Create**: [$create](), [$createBatch]()
  - **Read**: [$find](), [$findOne](), [$findIn](), [$findIds]()
  - **Update**: [$patch](), [$patchOne](), [$patchIn](), [$patchBatch]()
  - **Delete**: [$remove](), [$removeOne](), [$removeIn]()

You can extend it with [CMDs]() for everything else.