import { CrudContext, CrudService, CmdHooks } from "@eicrud/core/crud";
import { tk_cmd_name } from "./tk_cmd_lname.action";
import { tk_cmd_dto_name, tk_cmd_return_dto_name } from "./tk_cmd_lname.dto";

export class tk_cmd_nameHooks extends CmdHooks<tk_cmd_dto_name, tk_cmd_return_dto_name> {
    async beforeControllerHook(
        dto: tk_cmd_dto_name,
        ctx: CrudContext,
      ): Promise<any> {
        // before tk_cmd_name (entry controller)

        return dto;
      }
    
      async afterControllerHook(
        dto: tk_cmd_dto_name,
        result: tk_cmd_return_dto_name,
        ctx: CrudContext,
      ): Promise<any> {
        // after tk_cmd_name (entry controller)

        return result;
      }
    
      async errorControllerHook(
        dto: tk_cmd_dto_name,
        error: any,
        ctx: CrudContext,
      ): Promise<any> {
        // on tk_cmd_name error (entry controller)

        return Promise.resolve();
      }
};

export const hooks = new tk_cmd_nameHooks();

