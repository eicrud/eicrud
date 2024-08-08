import { CmdSecurity } from '@eicrud/core/config';
import { test_trigger_hello } from './test_trigger_hello.action';
import {
  TestTriggerHelloDto,
  TestTriggerHelloReturnDto,
} from './test_trigger_hello.dto';
import { HookTrigger } from '../../hook-trigger.entity';
import { hooks } from './test_trigger_hello.hooks';

const getCmdSecurity = (
  test_trigger_hello,
  hookTrigger,
): CmdSecurity<TestTriggerHelloDto, HookTrigger, TestTriggerHelloReturnDto> => {
  return {
    dto: TestTriggerHelloDto,
    hooks,
    rolesRights: {
      user: {
        async defineCMDAbility(can, cannot, ctx) {
          // Define abilities for user
          can(test_trigger_hello, hookTrigger);
        },
      },
    },
  };
};

export const TestTriggerHelloSecurity = {
  getCmdSecurity,
  action: test_trigger_hello,
};
