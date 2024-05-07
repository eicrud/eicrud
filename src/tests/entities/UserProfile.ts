import { BaseEntity, AutoPath, EntityLoaderOptions, Loaded, Reference, LoadedReference, EntityDTO, EntityKey, SerializeOptions, FromEntityType, EntityData, IsSubset, AssignOptions, MergeSelected, FindOneOptions, Property, PrimaryKey, OneToOne, Entity, Embeddable, Embedded, Unique } from "@mikro-orm/core";
import { AddEager } from "@mikro-orm/core/typings";
import { CrudEntity } from "../../crud/model/CrudEntity";
import { IsDate, IsMongoId, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Validate, ValidateNested } from "class-validator";
import { MyUser } from "./MyUser";
import { Transform, Type } from "class-transformer";
import { ObjectId } from "@mikro-orm/mongodb";



@Entity()
export class UserProfile implements CrudEntity {

    @PrimaryKey()
    @IsString()
    @IsOptional()
    _id: string;

    @OneToOne(() => MyUser, user => user.profile, { owner: true })
    @IsString()
    user: MyUser | string;

    @Property()
    @Unique()
    @IsString()
    @MaxLength(30)
    userName: string;

    @Property({ nullable: true })
    @IsString()
    @IsOptional()
    @MaxLength(300)
    bio: string;

    @Property()
    createdAt: Date;

    @Property()
    updatedAt: Date;

}