import { CrudSecurity } from '@eicrud/core/config';
import { serviceCmds } from './cmds';

export function getSecurity(picture: string): CrudSecurity {
  return {
    maxItemsInDb: 10,
    rolesRights: {
      super_admin: {
        async defineCRUDAbility(can, cannot, ctx) {
          can('crud', picture);
        },
      },
      admin: {},
      moderator: {},
      user: {},

      guest: {},
    },

    cmdSecurityMap: Object.keys(serviceCmds).reduce((acc, cmd) => {
      acc[cmd] = serviceCmds[cmd].getCmdSecurity(cmd, picture);
      return acc;
    }, {}),
  };
}
