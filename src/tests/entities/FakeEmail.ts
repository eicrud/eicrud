import { BaseEntity, AutoPath, EntityLoaderOptions, Loaded, Reference, LoadedReference, EntityDTO, EntityKey, SerializeOptions, FromEntityType, EntityData, IsSubset, AssignOptions, MergeSelected, FindOneOptions, Property, Entity } from "@mikro-orm/core";
import { AddEager } from "@mikro-orm/core/typings";
import { CrudEntity } from "../../crud/model/CrudEntity";

@Entity()
export class FakeEmail implements CrudEntity {

    @Property()
    to: string;

    @Property()
    message: string;

    @Property()
    type: string;

    @Property()
    createdAt: Date;

    @Property()
    updatedAt: Date;
}