class subTestCmdDto {
  @$MaxSize(100)
  @$ToLowerCase()
  subfield: string;
}

export class Test_cmd_rate_limitedDto {
  @$Transform((value: string) => value.toUpperCase())
  returnMessage: string;

  @$Type(subTestCmdDto)
  sub?: subTestCmdDto;

  forbiddenField?: string;
}
