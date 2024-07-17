  async tk_cmd_name(
      dto: tk_cmd_dto_name,
      options: ICrudOptions = undefined,
      copts?: ClientOptions,
    ): Promise<tk_cmd_return_dto_name> {
      return super.cmd('tk_cmd_name', dto, options, copts);
  }

  async tk_cmd_nameS(
      dto: tk_cmd_dto_name,
      options: ICrudOptions = undefined,
      copts?: ClientOptions,
    ): Promise<tk_cmd_return_dto_name> {
      return super.cmdS('tk_cmd_name', dto, options, copts);
  }

  async tk_cmd_nameL(
      dto: tk_cmd_dto_name,
      options: ICrudOptions = undefined,
      copts?: ClientOptions,
    ): Promise<tk_cmd_return_dto_name> {
      return super.cmdL('tk_cmd_name', dto, options, copts);
  }

  async tk_cmd_nameSL(
      dto: tk_cmd_dto_name,
      options: ICrudOptions = undefined,
      copts?: ClientOptions,
    ): Promise<tk_cmd_return_dto_name> {
      return super.cmdSL('tk_cmd_name', dto, options, copts);
  }