import { PrimaryKey, OneToOne, Property, ManyToOne, Entity, Embeddable, Embedded } from "@mikro-orm/core";
import { Allow, IsDate, IsInt, IsMongoId, IsOptional, IsString, ValidateNested } from "class-validator";
import { CrudEntity } from "../../core/crud/model/CrudEntity";
import { MyUser } from "./MyUser";
import { $MaxLength, $MaxSize, $ToLowerCase, $Transform, $Trim, $Type } from "../../core/crud/transform/decorators";



@Embeddable()
export class Slice {

    @Property()
    @IsInt()
    @IsOptional()
    size?: number = 1;

    @Property()
    @IsString()
    @$MaxSize(10)
    name: string;
}

@Embeddable()
export class Seed {

    @Property()
    @IsInt()
    @IsOptional()
    size: number = 1;

    @Property()
    @IsString()
    @$MaxSize(10)
    name: string;

}

@Entity()
export class Melon implements CrudEntity {

    @PrimaryKey({ name: '_id' })
    @IsString()
    @IsOptional()
    id: string;

    @ManyToOne(() => MyUser)
    @IsString()
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

    @Property({ nullable: true })
    @IsString()
    @IsOptional()
    @$MaxSize(100, 5)
    longName: string;

    @Embedded(() => Slice, { nullable: true })
    @$Type(Slice)
    @IsOptional()
    @ValidateNested()
    firstSlice: Slice;

    @Embedded(() => Seed, { array: true, nullable: true })
    @$Type(Seed)
    @$Transform((value: Seed) => {return { ...value, name: value.name.toLowerCase() }}, { each: true })
    @$Transform((value: Seed[]) => {return value.filter((v) => v.size > 0)})
    @ValidateNested({ each: true })
    @$MaxLength(5, 2)
    seeds: Seed[];


    @Property({ nullable: true })
    @Allow()
    stringSeeds: string[];

    @Property()
    @IsInt()
    price: number;

    @Property()
    createdAt: Date;

    @Property()
    updatedAt: Date;

}