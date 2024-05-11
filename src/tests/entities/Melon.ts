import { PrimaryKey, OneToOne, Property, ManyToOne, Entity } from "@mikro-orm/core";
import { IsDate, IsInt, IsMongoId, IsOptional, IsString } from "class-validator";
import { CrudEntity } from "../../crud/model/CrudEntity";
import { MyUser } from "./MyUser";
import { $ToLowerCase, $Transform, $Trim } from "../../crud/transform/decorators";

@Entity()
export class Melon implements CrudEntity {

    @PrimaryKey({ name: '_id'})
    @IsString()
    @IsOptional()
    id: string;

    @ManyToOne(() => MyUser)
    @IsMongoId()
    owner: MyUser | string;

    @Property()
    @IsString()
    ownerEmail: string;

    @Property()
    @IsInt()
    @IsOptional()
    size: number = 1;

    @Property()
    @IsString()
    name: string;

    @Property()
    @IsInt()
    price: number;

    @Property()
    createdAt: Date;

    @Property()
    updatedAt: Date;

}