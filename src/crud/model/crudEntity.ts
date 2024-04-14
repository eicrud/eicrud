import { CrudSecurity } from "./CrudSecurity";



export interface CrudEntity {
    createdAt: Date;
    updatedAt: Date;
}


export class CrudDto {
    fields?: string[];
    limit?: number;
    populate?: string[];

}

