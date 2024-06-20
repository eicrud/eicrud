import { CrudSecurity } from '@eicrud/core/config';
import { serviceCmds } from './cmds';

export function getSecurity(picture: string): CrudSecurity {
  return {
    rolesRights: {
      guest: {
        async defineCRUDAbility(can, cannot, ctx) {
          // Define abilities for guest
        },
      },
    },

    cmdSecurityMap: Object.keys(serviceCmds).reduce((acc, cmd) => {
      acc[cmd] = serviceCmds[cmd].getCmdSecurity(cmd, picture);
      return acc;
    }, {}),
  };
}
