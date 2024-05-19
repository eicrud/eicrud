import { Property, PrimaryKey, OneToOne, Entity, Embeddable, Embedded, Unique, ManyToOne } from "@mikro-orm/core";
import { CrudEntity } from "../../core/crud/model/CrudEntity";
import { IsMongoId, IsNumber, IsOptional, IsString,MaxLength, ValidateNested, } from "class-validator";
import { MyUser } from "./MyUser";
import { $ToLowerCase, $Trim, $Transform, $Type } from "../../core/crud/transform/decorators";
import { UserProfile } from "./UserProfile";


@Entity()
export class Picture implements CrudEntity {

    @PrimaryKey({ name: '_id'})
    @IsString()
    @IsOptional()
    id: string;

    @ManyToOne(() => UserProfile)
    @IsMongoId()
    profile: UserProfile | string;

    @Property()
    @IsNumber()
    width: number;

    @Property()
    @IsNumber()
    height: number;

    @Property({ nullable: true})
    @IsString()
    @IsOptional()
    @MaxLength(15)
    alt: string;

    @Property()
    @IsString()
    src: string;

    @Property()
    createdAt: Date;

    @Property()
    updatedAt: Date;

}