import { CrudSecurity } from "../../auth/model/CrudSecurity";



export class CrudEntity {
    _id: string;
    _dto?: CrudDto;
    security: CrudSecurity = new CrudSecurity();
    createdAt: Date = new Date();
    updatedAt: Date = new Date();
    
}


export class CrudDto {
    fields?: string[];
    limit?: number;
    populate?: string[];

}

