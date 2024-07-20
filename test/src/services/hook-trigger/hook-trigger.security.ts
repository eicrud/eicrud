import { CrudSecurity } from '@eicrud/core/config';
import { serviceCmds } from './cmds';

export function getSecurity(hooktrigger: string): CrudSecurity {
  return {
    rolesRights: {
      user: {
        maxBatchSize: 5,
        async defineCRUDAbility(can, cannot, ctx) {
          // Define abilities for user
          can('crud', hooktrigger);
        },
      },
    },

    cmdSecurityMap: Object.keys(serviceCmds).reduce((acc, cmd) => {
      acc[cmd] = serviceCmds[cmd].getCmdSecurity(cmd, hooktrigger);
      return acc;
    }, {}),
  };
}
