---
description: Here are details on how Eicrud validates incoming requests.
comments: true
---

Eicrud's validation happens at the controller level (between the client, and your services).

[Entities](../services/entity.md) and [commands DTOs](../services/commands.md) are validated the same way.

```typescript 
export class CmdDto {
    @IsString()
    @IsOptional()
    arg: string;
}
```

You can use any [class-validator decorator](https://github.com/typestack/class-validator/tree/develop?tab=readme-ov-file#validation-decorators){:target="_blank"} in your DTOs.

!!! note
    Fields that aren't annotated with a `class-validator` decorator won't be allowed in the DTO. You can use the `@Allow` decorator to bypass that rule, but we recommend using proper validation instead. 

## Nested Validation

`class-validator`'s `@ValidateNested` will only work when decorator `@$Type` is applied.

```typescript 
import { $Type } from '@eicrud/core/validation'

export class CmdDto {
    @$Type(Slice)
    @ValidateNested()
    firstSlice: Slice;
}
```
```typescript
export class Slice {
    @IsInt()
    @IsOptional()
    size?: number = 1;
    @IsString()
    name: string;
}
```

## Eicrud decorators
Eicrud offers custom decorators you can use.

**$MaxSize(size: number, addPerTrustPoint?: number)**

Specify the max length of the stringified argument.

```typescript 
import { $MaxSize } from '@eicrud/core/validation'

export class CmdDto {
    @$MaxSize(300)
    bio: string;
}
```
!!! warning 
    By default, every DTO field has a max stringified size of `50` (specified in [ValidationOptions](../configuration/validation.md)->`defaultMaxSize`). This means you need to decorate fields with     `@$MaxSize(x)` to bypass this limit. Using `class-validator`'s `@MaxLength` won't affect that limit. Setting `defaultMaxSize` to 0 disables that check.

**$MaxArLength(length: number, addPerTrustPoint?: number)**

Specify the max length of an array argument.

```typescript 
import { $MaxArLength } from '@eicrud/core/validation'

export class CmdDto {
    @$Type(Seed)
    @$MaxArLength(5)
    seeds: Seed[];
}
```

!!! note
    `@$MaxArLength` must be used with `@$Type` decorator, or else `@$MaxSize` will be applied.

!!! warning 
    By default, `@$Type` DTO fields have a max length of `20` (specified in [ValidationOptions](../configuration/validation.md)->`defaultMaxArLength`). This means you need to decorate fields with     `@$MaxArLength(x)` to bypass this limit.

## Validation Pipe
You can use `CrudValidationPipe` to apply Eicrud's validation and transforms to your own [NestJS controllers](https://docs.nestjs.com/controllers){:target="_blank"}.
```typescript
import { CrudValidationPipe } from '@eicrud/core/validation';

@Get('hello')
async get(@Query(new CrudValidationPipe()) query: MyQuery) {
    return `Hello ${query.name}`;
}

export class MyQuery {
    @IsOptional()
    @IsString()
    @$Transform((value) => value.toUpperCase())
    name: string;
}
```