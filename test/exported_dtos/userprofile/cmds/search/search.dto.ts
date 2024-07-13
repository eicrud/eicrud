export class SearchDto {
  @$Transform((v: string) => v.replace(/[.*+?^$}{)(|[\]\\]/g, '\\$&'))
  userNameLike: string;

  type?: string;
}
