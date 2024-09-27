import { CrudRole } from '@eicrud/core/config';

export const roles: CrudRole[] = [
  {
    name: 'super_admin',
    isAdminRole: true,
    canMock: true,
    inherits: ['admin'],
  },
  {
    name: 'admin',
    isAdminRole: true,
    canMock: true,
    inherits: ['trusted_user'],
  },
  {
    name: 'moderator',
    inherits: ['trusted_user'],
  },
  {
    name: 'trusted_user',
    inherits: ['user'],
  },
  {
    name: 'validation_skipper_child',
    inherits: ['validation_skipper'],
  },
  {
    name: 'validation_skipper',
    inherits: ['user'],
  },
  {
    name: 'user',
    inherits: ['guest'],
  },
  { name: 'guest' },
] as const satisfies CrudRole[];

export type RoleType = (typeof roles)[number]['name'];

export const rolesList = roles.map((role) => role.name);
