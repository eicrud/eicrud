import { Property, Entity, PrimaryKey } from "@mikro-orm/core";
import { CrudEntity } from "../../crud/model/CrudEntity";

@Entity()
export class FakeEmail implements CrudEntity {

    @PrimaryKey({ name: '_id'})
    id: string;

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