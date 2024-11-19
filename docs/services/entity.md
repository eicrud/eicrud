An Eicrud Entity is a database schema as well as a DTO (data transfer object) for CRUD operations. It represents "what the data can be".

## Schema

Fields that you annotate with [Mikro-orm](https://mikro-orm.io){:target="_blank"}'s decorators are part of your database schema.

```typescript title="services/profile/profile.entity.ts"
import { Entity, PrimaryKey, Property } from "@mikro-orm/core";

@Entity()
export class Profile implements CrudEntity {

    @PrimaryKey({ name: '_id' })
    id: string;

    @OneToOne(() => User, user => user.profile)
    owner: User | string;

    @Property()
    createdAt: Date;

    @Property()
    updatedAt: Date;

    notPersisted: number;

}
```

!!! note
    Non annotated fields are not persisted in the database.

Learn how to define entities with [Mikro-orm's documentation](https://mikro-orm.io/docs/defining-entities){:target="_blank"}.

## [Validation](../validation/definition.md)
Fields that you annotate with [class-validator](https://mikro-orm.io){:target="_blank"}'s decorators are part of your DTO.

```typescript title="services/profile/profile.entity.ts"
import { IsString, IsOptional } from "class-validator";

export class Profile implements CrudEntity {
    
    @IsOptional()
    @IsString()
    id: string;

    @IsString()
    owner: User | string;

    createdAt: Date;

    updatedAt: Date;

}
```

!!! note
    Non-annotated fields are not allowed in the DTO, and thus cannot be queried by the [client](../client/setup.md).


## [Transform](../validation/transform.md)
Fields that you annotate with Eicrud's [transform decorators](../validation/transform.md) will be transformed at the controller level.

```typescript title="services/profile/profile.entity.ts"
import { $Transform } from '@eicrud/core/validation';

export class Profile implements CrudEntity {
    
    id: string;

    @$Transform((value ) => {
    return value.toLowerCase().trim()
    })
    username: User | string;

    createdAt: Date;

    updatedAt: Date;

}
```

!!! warning
    The `class-transformer` package isn't compatible with Eicrud's validation, make sure to use Eicrud's [decorators](../validation/transform.md).

## Mix and match

You can combine all of the above in a single entity class.

```typescript title="services/profile/profile.entity.ts"
import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { IsString, IsOptional, IsInt } from "class-validator";
import { $Transform } from '@eicrud/core/validation';

@Entity()
export class Profile implements CrudEntity {
    @IsOptional()
    @IsString()
    @PrimaryKey({ name: '_id' })
    id: string;

    @IsString()
    @OneToOne(() => User, user => user.profile)
    owner: User | string;

    @$Transform((value ) => {
    return value.toLowerCase().trim()
    })
    @IsString()
    username: User | string;

    @Property()
    createdAt: Date;

    @Property()
    updatedAt: Date;

    @IsInt()
    notPersisted: number;

}
```