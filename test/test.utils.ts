import { EntityManager, ObjectId } from "@mikro-orm/mongodb";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { UserProfile } from "./entities/UserProfile";
import { Melon } from "./entities/Melon";
import { CrudConfigService } from "../core/config/crud.config.service";
import { CrudUserService } from "../core/config/crud-user.service";
import { CrudUser } from "../core/config/model/CrudUser";


export interface TestUser{
  email: string,
  role: string,
  bio: string,
  id?: string,
  profileId?: string,
  profileType?: string,
  jwt?: string,
  skipProfile?:boolean,
  store?: any,
  melons?: number,
  favoriteColor?: string
  password?: string,
  lowercaseTrimmedField?: string
}


export function testMethod(arg: { app: NestFastifyApplication, 
    method: string,
    url: string,
    jwt?: string, 
    entityManager: EntityManager, 
    payload: any, 
    query: any,
    expectedCode: number,
    fetchEntity?: { entity: any, id: string },
    fetchEntities?: { entity: any, query: any },
    expectedObject?: any,
    expectedCrudCode?: number,
    crudConfig: CrudConfigService,
    returnLimitAndTotal?: boolean,
    basicAuth?: { username: string, password: string }
    }){
    const headers = {};
    if(arg.jwt){
        headers['Authorization'] = `Bearer ${arg.jwt}`;
    }
    if(arg.basicAuth){
      headers['Authorization'] = `Basic ${Buffer.from(`${arg.basicAuth.username}:${arg.basicAuth.password}`).toString('base64')}`;
    }
    const query = new URLSearchParams(arg.query as any).toString();
    const url = ['/auth', '/backdoor'].some(r=> arg.url.includes(r)) ? arg.url : '/crud/s/' + arg.query.service + arg.url.replace('/crud', '');
    return arg.app
      .inject({
        method: arg.method as any,
        url,
        headers,
        payload: arg.payload,
        query,
      })
      .then(async (result) => {
        let total;
        let limit;
        if(result.statusCode !== arg.expectedCode){
          if(typeof result.payload === 'string'){
            console.log(result.payload);
          }else{
            console.error(result.json());
          }
        }
        expect(result.statusCode).toEqual(arg.expectedCode);
        let res: any = {};

        if(result.payload != ''){
          try{
            res = result.json();
          }catch(e){
            res = result.payload;
          }
        }

        if(arg.expectedCrudCode){
          const er = JSON.parse(res.message);
          expect(er.code).toEqual(arg.expectedCrudCode);
        }

        if(arg.method === 'GET' && (arg.url.includes('many') || arg.url.includes('in') || arg.url.includes('ids'))){
          ({ total, limit } = res);
          res = res.data;
        }
        if(arg.fetchEntity){
            let id = arg.fetchEntity.id || res.id;
            id = arg.crudConfig.userService.dbAdapter.checkId(id);
            res = await arg.entityManager.fork().findOne(arg.fetchEntity.entity, { id });
            res = JSON.parse(JSON.stringify(res));
        }else if(arg.fetchEntities){
            res = await arg.entityManager.fork().find(arg.fetchEntities.entity, arg.fetchEntities.query);
            res = JSON.parse(JSON.stringify(res));
        }

        if(arg.expectedObject){
          const arr = Array.isArray(res) ? res : [res];
          expect(arr.length).toBeGreaterThan(0);
          for(const re of arr){
            for(const key in arg.expectedObject){
                expect(JSON.stringify(re[key])).toEqual(JSON.stringify(arg.expectedObject[key]));
            }
          }
        }
        if(arg.returnLimitAndTotal){
          return { data: res, total, limit };
        }
        return res;
      });
}

export async function createNewProfileTest(app, jwt, entityManager, payload, query, crudConfig: CrudConfigService, expectedCode = 201){ 
  const res = await  testMethod({ url: '/crud/one', method: 'POST', expectedCode, app, jwt: jwt, entityManager, payload, query, crudConfig});
  if(expectedCode !== 201){
    return;
  }
  let resDb = await entityManager.fork().findOne(UserProfile, { id: res[crudConfig.id_field] }) as UserProfile;
  resDb = JSON.parse(JSON.stringify(res));

  expect(res.userName).toEqual(payload.userName);
  expect(resDb.userName).toEqual(payload.userName);
  return res;
}

export function createMelons(NB_MELONS, owner: TestUser, crudConfig: CrudConfigService){
  const payloadArray = [];
  for(let i = 0; i < NB_MELONS; i++){
    const newMelon: Partial<Melon> = {
      name: `Melon ${i}`,
      owner: owner[crudConfig.id_field],
      price: i,
      ownerEmail: owner.email,
    }
    payloadArray.push(newMelon);
  }
  return payloadArray;
}


export async function createAccountsAndProfiles(users: Record<string, TestUser>, userService: CrudUserService<CrudUser>, crudConfig: CrudConfigService, config : { usersWithoutProfiles?: string[], testAdminCreds: { email?: string, password: string } }){
  
  const em = crudConfig.entityManager.fork();

  const promises = [];
  for(const key in users){
    const user = users[key];
    const createAccountDto = {
      email: user.email,
      password: user.password || config.testAdminCreds.password,
      role: user.role,
    }
    const prom = userService.$createAccount(createAccountDto, null ).then(
      async (accRes) => {
        users[key][crudConfig.id_field] = userService.dbAdapter.createNewId(accRes.userId);
        users[key].jwt = accRes.accessToken;
        if(!user.skipProfile){
          const newObj = {
            id: userService.dbAdapter.createNewId() as any,
            userName: key,
            user: users[key][crudConfig.id_field],
            bio: user.bio,
            createdAt: new Date(),
            updatedAt: new Date()
          }
          if(user.lowercaseTrimmedField){
            newObj['lowercaseTrimmedField'] = user.lowercaseTrimmedField;
          }
          if(user.profileType){
            newObj['type'] = user.profileType;
          }
          if(user.favoriteColor){
            newObj['favoriteColor'] = user.favoriteColor;
          }
          const newProfile = em.create(UserProfile, newObj);
          if(user.store) { user.store[key] = newProfile; }
          em.persist(newProfile);
          users[key].profileId = newProfile[crudConfig.id_field];
        }else{
          config.usersWithoutProfiles?.push(users[key][crudConfig.id_field]);
        }
        if(user.melons){
          const melons = createMelons(user.melons, user, crudConfig);
          for(const melon of melons){
            melon.id = userService.dbAdapter.createNewId() as any;
            melon.createdAt = new Date();
            melon.updatedAt = new Date();
            const newMelon = em.create(Melon, melon)
            em.persist(newMelon);
          }
        }
        await em.flush();

      }
    );
    promises.push(prom);
  }
  await Promise.all(promises);
}