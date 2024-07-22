import { CmdSecurity } from '@eicrud/core/config';
import { test_cmd_rate_limited } from './test_cmd_rate_limited.action';
import { TestCmdRateLimitedDto } from './test_cmd_rate_limited.dto';

const getCmdSecurity = (test_cmd_rate_limited, userprofile): CmdSecurity => {
  return {
    dto: TestCmdRateLimitedDto,
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
