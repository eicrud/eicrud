class subTestCmdDto {
  @$MaxSize(100)
  @$ToLowerCase()
  subfield: string;
}

export class Test_cmdDto {
  @$Transform((value: string) => value.toUpperCase())
  returnMessage: string;

  @$Type(subTestCmdDto)
  sub?: subTestCmdDto;

  forbiddenField?: string;
}
