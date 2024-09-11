    async $tk_cmd_name(dto: tk_cmd_dto_name, ctx: CrudContext, inheritance?: Inheritance): Promise<tk_cmd_return_dto_name> {
       return serviceCmds.tk_cmd_name.action.call(this, dto, ctx, inheritance);
    }