import { Property, PrimaryKey, OneToOne, Entity, Embeddable, Embedded, Unique } from "@mikro-orm/core";
import { CrudEntity } from "../../crud/model/CrudEntity";
import { IsOptional, IsString,MaxLength, } from "class-validator";
import { MyUser } from "./MyUser";



@Entity()
export class UserProfile implements CrudEntity {

    @PrimaryKey({ name: '_id'})
    @IsString()
    @IsOptional()
    id: string;

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

    @Property({ nullable: true})
    @IsString()
    @IsOptional()
    @MaxLength(15)
    astroSign: string;

    @Property()
    createdAt: Date;

    @Property()
    updatedAt: Date;

}