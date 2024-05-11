import { Property, PrimaryKey, OneToOne, Entity, Embeddable, Embedded, Unique } from "@mikro-orm/core";
import { CrudEntity } from "../../crud/model/CrudEntity";
import { IsMongoId, IsNumber, IsOptional, IsString,MaxLength, ValidateNested, } from "class-validator";
import { MyUser } from "./MyUser";
import { $ToLowerCase, $Trim, $Transform, $Type } from "../../crud/transform/decorators";

@Embeddable()
export class Geoloc {

    @Property({ nullable: true})
    @IsString()
    @IsOptional()
    @$ToLowerCase()
    @$Trim()
    street: string;

    @Property()
    @IsString()
    city: string;

    @Property({ nullable: true})
    @IsNumber()
    @IsOptional()
    zip: number;

}

@Entity()
export class UserProfile implements CrudEntity {

    @PrimaryKey({ name: '_id'})
    @IsString()
    @IsOptional()
    id: string;

    @OneToOne(() => MyUser, user => user.profile, { owner: true })
    @IsMongoId()
    user: MyUser | string;

    @Property()
    @Unique()
    @IsString()
    @MaxLength(30)
    userName: string;

    @Property()
    @IsString()
    @IsOptional()
    type: "basic" | "admin" = "basic";

    @Property({ nullable: true })
    @IsString()
    @IsOptional()
    @MaxLength(300)
    bio: string;

    @Property({ nullable: true})
    @IsString()
    @IsOptional()
    @MaxLength(15)
    astroSign: string;

    @Property({ nullable: true})
    @IsString()
    @IsOptional()
    @MaxLength(15)
    chineseSign: string;

    @Property()
    @IsString()
    @IsOptional()
    favoriteColor: string = "blue";

    @Property()
    createdAt: Date;

    @Property()
    updatedAt: Date;

    @Property({nullable: true})
    @IsString()
    @$ToLowerCase()
    @$Trim()
    @IsOptional()
    lowercaseTrimmedField: string;

    @Property({nullable: true})
    @IsString()
    @IsOptional()
    @$Transform((value: string) => value.toUpperCase())
    upperCaseField: string;


    @Embedded(() => Geoloc, { nullable: true })
    @IsOptional()
    @$Type(Geoloc)
    @ValidateNested()
    geoloc: Geoloc;

}