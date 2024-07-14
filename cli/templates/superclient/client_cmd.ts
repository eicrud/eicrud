async tk_cmd_lname(
    dto: tk_cmd_dto_name,
    options: ICrudOptions = undefined,
    copts?: ClientOptions,
  ): Promise<tk_cmd_return_dto_name> {
    return this.cmd('tk_cmd_lname', dto, options, copts);
}

async tk_cmd_lnameS(
    dto: tk_cmd_dto_name,
    options: ICrudOptions = undefined,
    copts?: ClientOptions,
  ): Promise<tk_cmd_return_dto_name> {
    return this.cmdS('tk_cmd_lname', dto, options, copts);
}

async tk_cmd_lnameL(
    dto: tk_cmd_dto_name,
    options: ICrudOptions = undefined,
    copts?: ClientOptions,
  ): Promise<tk_cmd_return_dto_name> {
    return this.cmdL('tk_cmd_lname', dto, options, copts);
}

async tk_cmd_lnameSL(
    dto: tk_cmd_dto_name,
    options: ICrudOptions = undefined,
    copts?: ClientOptions,
  ): Promise<tk_cmd_return_dto_name> {
    return this.cmdSL('tk_cmd_lname', dto, options, copts);
}