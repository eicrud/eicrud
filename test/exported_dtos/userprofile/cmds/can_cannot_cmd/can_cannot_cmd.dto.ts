class subTestCmdDto {
  @$MaxSize(100)
  @$ToLowerCase()
  subfield: string;
}

export class CanCannotCmdDto {
  @$Transform((value: string) => value.toUpperCase())
  returnMessage: string;

  @$Type(subTestCmdDto)
  sub?: subTestCmdDto;

  forbiddenField?: string;
}
