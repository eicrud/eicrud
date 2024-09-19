import { CrudRole } from "@eicrud/core/config";

export const roles = [
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
] as const satisfies CrudRole[];

export type RoleType = typeof roles[number]['name'];