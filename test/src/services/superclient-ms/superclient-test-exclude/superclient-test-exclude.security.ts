import { CrudSecurity } from '@eicrud/core/config';
import { serviceCmds } from './cmds';
import { SuperclientTestExclude } from './superclient-test-exclude.entity';

export function getSecurity(
  superclientTestExclude: string,
): CrudSecurity<SuperclientTestExclude> {
  return {
    rolesRights: {
      guest: {
        async defineCRUDAbility(can, cannot, ctx) {
          // Define abilities for guest
        },
      },
    },

    cmdSecurityMap: Object.keys(serviceCmds).reduce((acc, cmd) => {
      acc[cmd] = serviceCmds[cmd].getCmdSecurity(cmd, superclientTestExclude);
      return acc;
    }, {}),
  };
}
