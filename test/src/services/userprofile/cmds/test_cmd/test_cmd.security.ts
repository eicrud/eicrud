import { CmdSecurity } from '@eicrud/core/config';
import test_cmd from './test_cmd.action';
import Test_cmdDto from './test_cmd.dto';

const getCmdSecurity = (test_cmd, USER_PROFILE): CmdSecurity => {
  return {
    dto: Test_cmdDto,
    maxUsesPerUser: 10,
    additionalUsesPerTrustPoint: 1,
    rolesRights: {
      user: {
        async defineCMDAbility(can, cannot, ctx) {
          can('test_cmd', USER_PROFILE);
        },
      },

      guest: {
        async defineCMDAbility(can, cannot, ctx) {
          can('test_cmd', USER_PROFILE, ['returnMessage'], {
            returnMessage: "I'M A GUEST!",
          });
        },
      },
    },
  };
};

export const test_cmdSecurity = {
  getCmdSecurity,
  action: test_cmd,
};
