import { PrimaryKey, OneToOne, Property, ManyToOne, Entity } from "@mikro-orm/core";
import { IsDate, IsInt, IsMongoId, IsOptional, IsString } from "class-validator";
import { CrudEntity } from "../../crud/model/CrudEntity";
import { MyUser } from "./MyUser";

@Entity()
export class Melon implements CrudEntity {

    @PrimaryKey({serializedName: '_id'})
    @IsString()
    @IsOptional()
    _id: string;

    @ManyToOne(() => MyUser)
    @IsString()
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