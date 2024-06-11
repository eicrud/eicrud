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