import { CmdSecurity } from '@eicrud/core/config';
import { test_trigger } from './test_trigger.action';
import { TestTriggerDto } from './test_trigger.dto';

const getCmdSecurity = (test_trigger, hooktrigger): CmdSecurity => {
  return {
    dto: TestTriggerDto,
    rolesRights: {
      user: {
        async defineCMDAbility(can, cannot, ctx) {
          // Define abilities for user
          can('test_trigger', hooktrigger);
        },
      },
    },
  };
};

export const testTriggerSecurity = {
  getCmdSecurity,
  action: test_trigger,
};
