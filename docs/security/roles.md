Every ability in Eicrud is attached to a role. Roles are dynamically assigned to users via the property [CrudUser](./user.md)->`role`.

```typescript title="roles.ts"
import { CrudRole } from "@eicrud/core/config";

export const roles: CrudRole[] = [
    { 
        name: 'admin', 
        isAdminRole: true,
        canMock: true,
        inherits: ['user']
    },
    { 
        name: 'user', 
        inherits: ['guest']
    },
    { 
        name: 'guest'
    },
]
```

Roles must be registered in the [config service]().
```typescript
@Injectable()
export class MyConfigService extends CrudConfigService {
    constructor(...) {
        ...
        this.addRoles(roles);
    }
}
```

## Authorization

Eicrud's authorization checks role ability from root to branches:  

- `user.role` : defineAbility + check against request.
    - `user.role`->`inherits[0]` : defineAbility + check against request.
        - `inherit`->`inherits[0]` : defineAbility + check against request.
        - `inherit`->`inherits[1]`
        - ...
    - `user.role`->`inherits[1]`
    - ...

The authorization stops going up the tree whenever a role passes the check, it also skips already-checked roles.

!!! note
    This means `cannot` rules from inherited roles have no effect if the child role passes the authorization check.

## Guest Role
Your application needs a guest role to define unauthenticated users' abilities. It is set the [config service]()'s constructor and defaults as `'guest'`.  

## Options

**name: string**  
A unique name identifying the role.

**isAdminRole: boolean**  
Indicate if the role is an admin role. Admin roles start with more [trust]() and are allowed to perform [batch operations]().

**canMock: boolean**  
Indicate if the role can mock inherited roles. Useful for debugging.

**noTokenRefresh: boolean**  
Indicate that the user's JWT tokens shouldn't be automatically extended even when [AuthenticationOptions]()->`renewJwt` is set.


**inherits: string[]**  
A list of roles to inherit abilities from.