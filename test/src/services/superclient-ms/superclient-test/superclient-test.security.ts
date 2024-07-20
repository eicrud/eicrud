import { CrudSecurity } from '@eicrud/core/config';
import { serviceCmds } from './cmds';
import { SuperclientTest } from './superclient-test.entity';

export function getSecurity(
  superclientTest: string,
): CrudSecurity<SuperclientTest> {
  return {
    rolesRights: {
      guest: {
        async defineCRUDAbility(can, cannot, ctx) {
          // Define abilities for guest
        },
      },
    },

    cmdSecurityMap: Object.keys(serviceCmds).reduce((acc, cmd) => {
      acc[cmd] = serviceCmds[cmd].getCmdSecurity(cmd, superclientTest);
      return acc;
    }, {}),
  };
}
