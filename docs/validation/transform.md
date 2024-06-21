Eicrud's transformations happen at the controller level (between the client, and your services).

[Entities](../services/entity.md) and [commands DTOs](../services/commands.md) are transformed the same way.

!!! note 
    Transform happens **before** validation.

You can use the following decorators to transform your arguments.


## **$Transform**

Transform an argument with the specified function.

```typescript 
import { $Transform } from '@eicrud/core/validation'

export class CmdDto {
    @$Transform((value: string) => value.toUpperCase())
    message: string;
}
```

You can specify the desired behavior on arrays.

```typescript 
export class CmdDto {
    @$Transform((value: string[]) => value[0])
    array_a: string[];

    @$Transform((value: string) => value.toUpperCase(), { each: true })
    array_b: string[];
}
```

## **$ToLowerCase**

Transform a string argument to lowercasing.

```typescript 
import { $ToLowerCase } from '@eicrud/core/validation'

export class CmdDto {
    @$ToLowerCase()
    email: string;
}
```

## **$Trim**

Trim a string argument.

```typescript 
import { $Trim } from '@eicrud/core/validation'

export class CmdDto {
    @$Trim()
    email: string;
}
```

## **$Delete**
Delete an argument.

```typescript 
import { $Delete } from '@eicrud/core/validation'

export class CmdDto {
    @$Delete()
    frontEndProperty: string;
}
```

