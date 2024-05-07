import { EntityManager } from "@mikro-orm/mongodb";
import { NestFastifyApplication } from "@nestjs/platform-fastify";






export function testMethod(arg: { app: NestFastifyApplication, 
    method: string,
    url: string,
    jwt: string, 
    entityManager: EntityManager, 
    payload: any, 
    query: any,
    expectedCode: number,
    fetchEntity?: { entity: any, id: string },
    expectedObject?: any  
    
    }){
    return arg.app
      .inject({
        method: arg.method as any,
        url: arg.url,
        headers: {
          Authorization: `Bearer ${arg.jwt}`
        },
        payload: arg.payload,
        query: new URLSearchParams(arg.query as any).toString()
      })
      .then(async (result) => {
        if(result.statusCode !== arg.expectedCode){
            console.error(result.json());
        }
        expect(result.statusCode).toEqual(arg.expectedCode);
        let res: any = result.payload != '' ? result.json() : {};
        if(arg.fetchEntity){
            res = await arg.entityManager.fork().findOne(arg.fetchEntity.entity, { id: arg.fetchEntity.id });
            res = JSON.parse(JSON.stringify(res));
        }
        delete res?.updatedAt;
        delete res?.createdAt;
        delete res?._id
        if(arg.expectedObject){
            for(const key in arg.expectedObject){
                expect(res[key]).toEqual(arg.expectedObject[key]);
            }
            
        }
      });
}