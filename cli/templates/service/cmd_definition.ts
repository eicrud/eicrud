    async $tk_cmd_name(dto: tk_cmd_dto_name, ctx: CrudContext, inheritance?: any) {
       return await serviceCmds.tk_cmd_name.action(dto, this, ctx, inheritance);
    }