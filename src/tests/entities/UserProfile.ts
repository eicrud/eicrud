import { BaseEntity, AutoPath, EntityLoaderOptions, Loaded, Reference, LoadedReference, EntityDTO, EntityKey, SerializeOptions, FromEntityType, EntityData, IsSubset, AssignOptions, MergeSelected, FindOneOptions, Property, PrimaryKey, OneToOne } from "@mikro-orm/core";
import { AddEager } from "@mikro-orm/core/typings";
import { CrudEntity } from "../../crud/model/CrudEntity";
import { IsDate, IsMongoId, IsOptional, IsString, Max, MaxLength } from "class-validator";
import { MyUser } from "./MyUser";



export class UserProfile implements CrudEntity {

    @PrimaryKey()
    @IsMongoId()
    @IsOptional()
    _id: string;

    @OneToOne({ entity: () => MyUser })
    @IsMongoId()
    @IsOptional()
    user: MyUser;

    @Property()
    @IsString()
    @MaxLength(30)
    userName: string;

    @Property()
    @IsString()
    @MaxLength(300)
    bio: string;

    @Property()
    @IsDate()
    createdAt: Date;

    @Property()
    @IsDate()
    updatedAt: Date;
    

}