import { CrudSecurity, CrudUser } from '@eicrud/core/config';
import { serviceCmds } from './cmds';
import { CrudContext } from '@eicrud/core/crud';

export function getSecurity(userprofile: string): CrudSecurity {
  return {
    alwaysAllowedCrudOptions: ['returnUpdatedEntity'],
    rolesRights: {
      super_admin: {
        async defineCRUDAbility(can, cannot, ctx) {
          can('crud', userprofile);
        },

        async defineOPTAbility(can, cannot, ctx) {
          can('allowIdOverride', userprofile);
        },
      },
      admin: {
        async defineCRUDAbility(can, cannot, ctx: CrudContext) {
          can('crud', userprofile, { type: 'basic' });
        },

        async defineOPTAbility(can, cannot, ctx) {
          can('populate', userprofile, ['pictures']);
          can('populate', userprofile, 'user', { user: ctx.userId });
        },
      },
      moderator: {
        async defineCRUDAbility(can, cannot, ctx: CrudContext) {
          can('read', userprofile, { type: 'basic' });
        },
      },
      user: {
        async defineCRUDAbility(can, cannot, ctx) {
          const user: CrudUser = ctx.user;
          const userId = ctx.userId;
          can('crud', userprofile, { user: userId });
          cannot('cu', userprofile, { type: 'admin' });
          cannot('cu', userprofile, ['forbiddenField']);
        },
      },
      guest: {},
    },

    cmdSecurityMap: Object.keys(serviceCmds).reduce((acc, cmd) => {
      acc[cmd] = serviceCmds[cmd].getCmdSecurity(cmd, userprofile);
      return acc;
    }, {}),
  };
}
