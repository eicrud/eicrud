import { Injectable } from '@nestjs/common';
import { CrudUserService } from '../user/crud-user.service';

@Injectable()
export class AccountManagementService {

    constructor(private readonly usersService: CrudUserService){
        
    }

    createAccount(email, password){ 

    }

}
