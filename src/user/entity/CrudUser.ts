import { CrudDto, CrudEntity } from "../../crud/model/CrudEntity";

// This should be a real class/interface representing a user entity


export interface CrudUser extends CrudEntity{
    email: string;
    password: string;

    lastLoginAttempt: Date;
    failedLoginCount: number;
    
    role: string;
  
    revokedCount: number;
    verifiedEmail: boolean;

    crudMap: Record<string, number>

    errorCount: number;
    incidentCount: number;

    trust: number;
    lastComputedTrust: Date;

    timeout: Date;
  };