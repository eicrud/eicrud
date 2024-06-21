    async $tk_cmd_name(dto: tk_cmd_dto_name, ctx: CrudContext, inheritance?: any) {
       return serviceCmds.tk_cmd_name.action.call(this, dto, ctx, inheritance);
    }