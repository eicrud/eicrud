import { Property, PrimaryKey, OneToOne, Entity, Embeddable, Embedded, Unique, Collection, OneToMany } from "@mikro-orm/core";
import { CrudEntity } from "../../core/crud/model/CrudEntity";
import { Equals, IsMongoId, IsNumber, IsOptional, IsString,MaxLength, ValidateNested, } from "class-validator";
import { MyUser } from "./MyUser";
import { $ToLowerCase, $Trim, $Transform, $Type, $Delete } from "../../core/crud/transform/decorators";
import { Picture } from "./Picture";

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
    @IsString()
    user: MyUser | string;

    @OneToMany(() => Picture, mel => mel.profile)
    pictures = new Collection<Picture>(this);

    @Unique()
    @Property()
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

    @Property({ nullable: true})
    @IsString()
    @IsOptional()
    @MaxLength(15)
    favoritePlanet: string;

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

    @Property({ nullable: true})
    @$Delete()
    fieldToDelete: string;

}