import { CrudDto, CrudEntity } from "../../crud/model/CrudEntity";

// This should be a real class/interface representing a user entity


export interface CrudData {
  cmdMap: Record<string, number>;
  itemsCreated: number;
}

export interface CrudUser extends CrudEntity{
    email: string;
    password: string;

    lastLoginAttempt: Date;
    failedLoginCount: number;
    
    role: string;
  
    revokedCount: number;
    verifiedEmail: boolean;

    crudUserDataMap: Record<string, CrudData>

    errorCount: number;
    incidentCount: number;

    trust: number;
    lastComputedTrust: Date;

    timeout: Date;
  };