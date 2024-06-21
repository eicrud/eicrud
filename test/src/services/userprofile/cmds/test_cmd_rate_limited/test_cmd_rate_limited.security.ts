import { CmdSecurity } from '@eicrud/core/config';
import test_cmd_rate_limited from './test_cmd_rate_limited.action';
import Test_cmd_rate_limitedDto from './test_cmd_rate_limited.dto';

const getCmdSecurity = (test_cmd_rate_limited, userprofile): CmdSecurity => {
  return {
    dto: Test_cmd_rate_limitedDto,
    minTimeBetweenCmdCallMs: 500,
    rolesRights: {
      user: {
        async defineCMDAbility(can, cannot, ctx) {
          can('test_cmd_rate_limited', userprofile);
        },
      },
    },
  };
};

export const test_cmd_rate_limitedSecurity = {
  getCmdSecurity,
  action: test_cmd_rate_limited,
};
