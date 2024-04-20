import { BaseEntity, Entity, EntityClass } from "@mikro-orm/core";
import { CrudSecurity } from "./CrudSecurity";




export interface CrudEntity extends EntityClass<any> {
    createdAt: Date;
    updatedAt: Date;
}


export class CrudDto {
    fields?: string[];
    limit?: number;
    populate?: string[];

}

