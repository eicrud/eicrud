export class SearchDto {
  @$Transform((v: string) => v.replace(/[.*+?^$}{)(|[\]\\]/g, '\\$&'))
  nameLike: string;

  @$MaxSize(-1)
  ids?: string[];

  ownerEmail?: string;
}
