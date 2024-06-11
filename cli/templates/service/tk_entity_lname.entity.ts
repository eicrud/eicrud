import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { IsString, IsOptional } from "class-validator";
import { CrudEntity } from "@eicrud/core/crud";


@Entity()
export default class tk_entity_name implements CrudEntity {

    @PrimaryKey({ name: '_id' })
    @IsString()
    @IsOptional()
    id: string;

    @Property()
    createdAt: Date;

    @Property()
    updatedAt: Date;

}