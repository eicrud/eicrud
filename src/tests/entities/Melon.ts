import { PrimaryKey, OneToOne, Property, ManyToOne } from "@mikro-orm/core";
import { IsDate, IsInt, IsMongoId, IsOptional } from "class-validator";
import { CrudEntity } from "../../crud/model/CrudEntity";
import { MyUser } from "./MyUser";

export class Melon implements CrudEntity {

    @PrimaryKey()
    @IsMongoId()
    @IsOptional()
    _id: string;

    @ManyToOne(() => MyUser)
    @IsMongoId()
    owner: MyUser;

    @Property()
    @IsInt()
    size: number;

    @Property()
    @IsInt()
    price: number;

    @Property()
    @IsDate()
    createdAt: Date;

    @Property()
    @IsDate()
    updatedAt: Date;


}