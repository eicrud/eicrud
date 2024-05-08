import { PrimaryKey, OneToOne, Property, ManyToOne, Entity } from "@mikro-orm/core";
import { IsDate, IsInt, IsMongoId, IsOptional, IsString } from "class-validator";
import { CrudEntity } from "../../crud/model/CrudEntity";
import { MyUser } from "./MyUser";

@Entity()
export class Melon implements CrudEntity {

    @PrimaryKey({ name: '_id'})
    @IsString()
    @IsOptional()
    id: string;

    @ManyToOne(() => MyUser)
    @IsString()
    owner: MyUser | string;

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
    @IsDate()
    createdAt: Date;

    @Property()
    @IsDate()
    updatedAt: Date;


}