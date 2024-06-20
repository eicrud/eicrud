import { CrudSecurity, CrudUser } from '@eicrud/core/config';
import { serviceCmds } from './cmds';

export function getSecurity(MELON: string): CrudSecurity {
  return {
    rolesRights: {
      super_admin: {
        async defineCRUDAbility(can, cannot, ctx) {
          can('crud', MELON);
        },
      },
      admin: {},
      trusted_user: {
        maxBatchSize: 5,
      },
      user: {
        async defineCRUDAbility(can, cannot, ctx) {
          const user: CrudUser = ctx.user;
          const userId = ctx.userId;
          can('cud', MELON, { owner: userId });
          cannot('cu', MELON, ['size']);
          can('read', MELON);
        },
      },
      guest: {
        async defineCRUDAbility(can, cannot, ctx) {
          can('read', MELON);
        },
      },
    },

    maxItemsPerUser: 10,
    additionalItemsInDbPerTrustPoints: 1,

    cmdSecurityMap: Object.keys(serviceCmds).reduce((acc, cmd) => {
      acc[cmd] = serviceCmds[cmd].getCmdSecurity(cmd, melon);
      return acc;
    }, {}),
  };
}
