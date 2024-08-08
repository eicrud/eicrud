import { CmdSecurity } from '@eicrud/core/config';
import { test_trigger } from './test_trigger.action';
import { TestTriggerDto } from './test_trigger.dto';
import { hooks } from './test_trigger.hooks';

const getCmdSecurity = (test_trigger, hooktrigger): CmdSecurity => {
  return {
    dto: TestTriggerDto,
    hooks,
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
