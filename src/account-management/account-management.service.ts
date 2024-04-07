import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class AccountManagementService {

    constructor(private readonly usersService: UsersService){
        
    }

    createAccount(email, password){ 

    }

}
