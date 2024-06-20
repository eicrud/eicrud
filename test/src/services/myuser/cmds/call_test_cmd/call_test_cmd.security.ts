import { CmdSecurity } from '@eicrud/core/config';
import call_test_cmd from './call_test_cmd.action';
import CallTestCmdDto from './call_test_cmd.dto';

const getCmdSecurity = (call_test_cmd, myuser): CmdSecurity => {
  return {
    dto: CallTestCmdDto,
    rolesRights: {
      guest: {
        async defineCMDAbility(can, cannot, ctx) {
          // Define abilities for user
          can(call_test_cmd, myuser);
        },
      },
    },
  };
};

export const callTestCmdSecurity = {
  getCmdSecurity,
  action: call_test_cmd,
};
