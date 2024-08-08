import { TestCmdGetSecurity } from './cmds/test_cmd_get/test_cmd_get.security';
import { searchSecurity } from './cmds/search/search.security';
import { test_cmd_rate_limitedSecurity } from './cmds/test_cmd_rate_limited/test_cmd_rate_limited.security';
import { canCannotCmdSecurity } from './cmds/can_cannot_cmd/can_cannot_cmd.security';
import { test_cmdSecurity } from './cmds/test_cmd/test_cmd.security';

//Auto generated file

export const serviceCmds = {
  test_cmd_get: TestCmdGetSecurity,
  search: searchSecurity,
  test_cmd_rate_limited: test_cmd_rate_limitedSecurity,
  can_cannot_cmd: canCannotCmdSecurity,
  test_cmd: test_cmdSecurity,
};
