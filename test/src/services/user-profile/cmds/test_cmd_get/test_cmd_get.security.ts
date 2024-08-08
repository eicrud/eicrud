import { CmdSecurity } from '@eicrud/core/config';
import { test_cmd_get } from './test_cmd_get.action';
import { TestCmdGetDto } from './test_cmd_get.dto';
import { UserProfile } from '../../user-profile.entity';

const getCmdSecurity = (
  test_cmd_get,
  userProfile,
): CmdSecurity<TestCmdGetDto, UserProfile> => {
  return {
    dto: TestCmdGetDto,
    allowGetMethod: true,
    rolesRights: {
      guest: {
        async defineCMDAbility(can, cannot, ctx) {
          // Define abilities for user
          can(test_cmd_get, userProfile);
        },
      },
    },
  };
};

export const TestCmdGetSecurity = {
  getCmdSecurity,
  action: test_cmd_get,
};
