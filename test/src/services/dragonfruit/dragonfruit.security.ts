import { CrudSecurity } from '@eicrud/core/config';
import { serviceCmds } from './cmds';
import { DragonFruit } from './dragonfruit.entity';

export function getSecurity(dragonfruit: string): CrudSecurity<DragonFruit> {
  return {
    rolesRights: {
      super_admin: {},
      admin: {},
      trusted_user: {
        async defineCRUDAbility(can, cannot, ctx) {
          can('read', dragonfruit);
        },
      },
      user: {},
      guest: {
        fields: ['name'],
        async defineCRUDAbility(can, cannot, ctx) {
          can('read', dragonfruit);
        },
      },
    },
    alwaysExcludeFields: ['secretCode'],

    cmdSecurityMap: Object.keys(serviceCmds).reduce((acc, cmd) => {
      acc[cmd] = serviceCmds[cmd].getCmdSecurity(cmd, dragonfruit);
      return acc;
    }, {}),
  };
}
