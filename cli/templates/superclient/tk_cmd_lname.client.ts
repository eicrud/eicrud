import { ClientOptions, CrudClient } from "@eicrud/client";
import { User } from "../dtos/user.dto";
import { ICrudOptions } from "@eicrud/shared/interfaces";


export class UserClient extends CrudClient<User> {

}