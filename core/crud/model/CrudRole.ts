export class CrudRole{
    name: string;
    isAdminRole? = false;
    canMock? = false;
    noTokenRefresh? = false;
    inherits?: string[] = [];
}