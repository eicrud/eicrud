import { CrudSecurity } from '@eicrud/core/config';
import { serviceCmds } from './cmds';
import { SuperclientTestExclude2 } from './superclient-test-exclude2.entity';

export function getSecurity(
  superclientTestExclude2: string,
): CrudSecurity<SuperclientTestExclude2> {
  return {
    rolesRights: {
      guest: {
        async defineCRUDAbility(can, cannot, ctx) {
          // Define abilities for guest
        },
      },
    },

    cmdSecurityMap: Object.keys(serviceCmds).reduce((acc, cmd) => {
      acc[cmd] = serviceCmds[cmd].getCmdSecurity(cmd, superclientTestExclude2);
      return acc;
    }, {}),
  };
}
