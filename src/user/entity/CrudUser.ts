import { CrudEntity } from "../../crud/model/crudEntity";

// This should be a real class/interface representing a user entity
export class CrudUser extends CrudEntity{

    email: string;
    password: string;
    lastLoginAttempt: Date;
    failedLoginCount: number;
    
    role: string;
  
    revokedCount: number;
    verifiedEmail: boolean;
  };