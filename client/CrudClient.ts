import { set } from "mnemonist";
import { ICrudOptions } from "../shared/interfaces";
import { ICrudQuery } from "../shared/interfaces";
import { Cookies } from "js-cookie"
import { FindResponseDto } from "../shared/interfaces";
import axios from "axios";
import { CrudErrors } from "../shared/CrudErrors";
import { ILoginDto, LoginResponseDto } from "../shared/interfaces";
import wildcard from "wildcard";
import { _utils } from "../core/utils";

export interface ClientStorage {

  get(name: string): string;
  set(name: string, value: string, durationDays: number, secure: boolean): void;
  del(name: string): void;

}

export class CookieStorage implements ClientStorage {
  get(name: string): string {
    return Cookies.get(name);
  }
  set(name: string, value: string, durationDays: number, secure: boolean): void {
    return Cookies.set(name, value, { expires: durationDays, secure: secure });
  }
  del(name: string): void {
    return Cookies.remove(name);
  }
}

export class MemoryStorage implements ClientStorage {

  memory = new Map<string, any>();

  get(name: string): string {
    return this.memory.get(name);
  }
  set(name: string, value: string, durationDays: number, secure: boolean): void {
    this.memory.set(name, value);
  }
  del(name: string): void {
    this.memory.delete(name);
  }
}


export interface ClientConfig { 
  serviceName: string, 
  url: string,
  onLogout?: () => void,
  storage?: ClientStorage, 
  id_field?: string
};

export interface ClientOptions {
  batchSize?: number;
}

/**
 * A client for CRUD operations.
 */
export class CrudClient<T> {

  JWT_COOKIE_KEY = "crud-client";

  onLogout: () => void;

  serviceName: string;
  url: string;
  storage: ClientStorage;

  id_field: string;

  limitingFields: string[] = [];

  constructor(args: ClientConfig) {
    this.serviceName = args.serviceName;
    this.url = args.url;
    this.id_field = args.id_field || "id";
    this.storage = args.storage || (document ? new CookieStorage() : new MemoryStorage());
    this.onLogout = args.onLogout;
  }

  private _getHeaders() {
    const headers: any = {};
    const jwt = this.storage.get(this.JWT_COOKIE_KEY);
    if (jwt) {
      headers.Authorization = `Bearer ${jwt}`
    }
    return headers;
  }

  logout() {
    this.storage.del(this.JWT_COOKIE_KEY);
    this.onLogout?.();
  }

  async checkToken() {
    const url = this.url + "/crud/auth";
    try {
      const res: LoginResponseDto = await axios.get(url, { headers: this._getHeaders() });

      if(res.refreshTokenSec){
        let days = Math.round(res.refreshTokenSec / 60 / 60 / 24);
        if(days < 1){
          days = 1;
        }
        this.storage.set(this.JWT_COOKIE_KEY, res.accessToken, days, false);
      }

      return res.userId;

    }catch(e){
      if(e.response && e.response.status === 401){
        this.logout();
      }
    }
  }

  async login(dto: ILoginDto): Promise<LoginResponseDto> {
    const url = this.url + "/crud/auth";

    let res: LoginResponseDto = (await axios.post(url, dto)).data;
    let days = 1;
    if(dto.expiresIn?.includes('d')){
      const dayStr = dto.expiresIn.replace('d', '');
      const dayNum = parseInt(dayStr);
      if(dayNum > 0){
        days = dayNum;
      }
    }
    this.setJwt(res.accessToken, days);
    return res;
  }

  setJwt(jwt: string, durationDays: number = 1) {
    this.storage.set(this.JWT_COOKIE_KEY, jwt, durationDays, true);
  }

  private async _tryOrLogout(method, optsIndex, ...args) {
    let res;
    try {
      res = await method(...args);
    } catch (e) {
      if (e.response && e.response.status === 401) {
        this.logout();
      } else {
        throw e;
      }
      args[optsIndex] = {
        ...args[optsIndex],
        headers: this._getHeaders()
      };
      res = await method(...args);

    }
    return res.data;
  }

  private async _doLimitQuery(fetchFunc: (q: ICrudQuery) => Promise<FindResponseDto<any>>, ICrudQuery: ICrudQuery) {
    const options = ICrudQuery.options || {};
    const res: FindResponseDto<any> = await fetchFunc({...ICrudQuery, options: JSON.stringify(options) as any});

    if (res.limit > 0 && (!options.limit || res.limit < options.limit) && res.total > res.limit) {
      let offset = res.limit;
      let total = options.limit || res.total;
      while (offset < total) {
        const newOptions: ICrudOptions = { ...options, limit: res.limit, offset };
        const newICrudQuery: ICrudQuery = {
          ...ICrudQuery,
          options: JSON.stringify(newOptions) as any,
        }
        const newRes: FindResponseDto<any> = await fetchFunc(newICrudQuery);
        res.data.push(...newRes.data);
        offset += res.limit;
      }
      res.limit = total;
    }

    return res;
  }

  async findOne(query: any, options: ICrudOptions = undefined): Promise<T> {
    const ICrudQuery: ICrudQuery = {
      options: JSON.stringify(options) as any,
      query: JSON.stringify(query)
    }
    const url = this.url + "/crud/s/" + this.serviceName + "/one";

    const res = await this._tryOrLogout(axios.get, 1, url, { params: ICrudQuery, headers: this._getHeaders() });

    return res;
  }

  async find(query: any, options: ICrudOptions = undefined): Promise<FindResponseDto<T>> {
    const ICrudQuery: ICrudQuery = {      
      options: options,
      query: JSON.stringify(query)
    }
    const url = this.url + "/crud/s/" + this.serviceName + "/many";

    const fetchFunc = async (crdQuery: ICrudQuery) => {
      return await this._tryOrLogout(axios.get, 1, url, { params: crdQuery, headers: this._getHeaders() });
    }

    return await this._doLimitQuery(fetchFunc, ICrudQuery);

  }

  async findIn(q: any[] | object, options: ICrudOptions = undefined, copts: ClientOptions = {}): Promise<FindResponseDto<T>> {
    const ICrudQuery: ICrudQuery = {      
      options: options,
    }
    let ids = [];
    let addToQuery = {}
    if(Array.isArray(q)){
      ids = q;
    }else{
      ids = q[this.id_field];
      addToQuery = q;
    }

    const url = this.url + "/crud/s/" + this.serviceName + "/in";

    const batchFunc = async (chunk: any[]) => {
      const newICrudQuery: ICrudQuery = {
        ...ICrudQuery,
        query: JSON.stringify({...addToQuery, [this.id_field]: chunk })
      }
      const fetchFunc = async (crdQ: ICrudQuery) => {
        return await this._tryOrLogout(axios.get, 1, url, { params: crdQ, headers: this._getHeaders() });
      }
  
      return await this._doLimitQuery(fetchFunc, newICrudQuery);
    }

    return await this._doBatch(batchFunc, ids, copts.batchSize, true);

  }

  async findIds(query: any, options: ICrudOptions = undefined): Promise<FindResponseDto<string>> {
    const ICrudQuery: ICrudQuery = {      
      options: options,
      query: JSON.stringify(query)
    }
    const url = this.url + "/crud/s/" + this.serviceName + "/ids";
    
    const fetchFunc = async (crdQ: ICrudQuery) => {
      return await this._tryOrLogout(axios.get, 1, url, { params: crdQ, headers: this._getHeaders() });
    }

    return await this._doLimitQuery(fetchFunc, ICrudQuery);
  }

  private async _doCmd(cmdName: string, dto: any, options: ICrudOptions, secure: boolean, limited: boolean): Promise<any> {
    const ICrudQuery: ICrudQuery = { 
      options: options,
    }
    const url = this.url + "/crud/s/" + this.serviceName + "/cmd/" + cmdName;

    const method = secure ? axios.post : axios.get;

    if (limited) {

      const fetchFunc = async (crdQ: ICrudQuery) => {
        return await this._tryOrLogout(method, 2, url, dto, { params: crdQ, headers: this._getHeaders() });
      }

      return await this._doLimitQuery(fetchFunc, ICrudQuery);

    }

    ICrudQuery.options = JSON.stringify(options) as any;
    const res = await this._tryOrLogout(secure ? axios.post : axios.patch, 2, url, dto, { params: ICrudQuery, headers: this._getHeaders() });

    return res;
  }

  /**
   * Moves data fields to query if they are in limitingFields. If a limiting field is prefixed with '!', it will only be deleted.
   * @param {Array} limitingFields 
   * @param query 
   * @param data 
   * @returns [query, data]
   * @example processLimitingFields(['id', '!name'], {}, { id: 1, name: 'John', age: 30 }) => [{ id: 1, }, { age: 30 } ]
   */
  processLimitingFields(limitingFields: string[], query: object, data: object): [object, object]{
    if(!limitingFields.includes(this.id_field)) {
      limitingFields.push(this.id_field);
    }
    for(const f of limitingFields) {
      let deleteField = false;
      let match = f;
      if(f.startsWith('!')){
        deleteField = true;
        match = f.substring(1);
      }
      for(const key in data){
        if(wildcard(match, key)){
          if(!deleteField){
            query[key] = data[key];
          }
            delete data[key];
        }
      }
    }
    return [query, data];
  }

  async patchOne(q: object | string[], d: object, options: ICrudOptions = undefined): Promise<T> {
    let query = {};
    let data = d;
    if (Array.isArray(q)) {
      [query, data] = this.processLimitingFields(q, query, data);
    }else if (q == null){
      [query, data] = this.processLimitingFields(this.limitingFields, query, data);
    } else {
      query = q;
    }
    const ICrudQuery: ICrudQuery = {      
      options: JSON.stringify(options) as any,
      query: JSON.stringify(query)
    }

    const url = this.url + "/crud/s/" + this.serviceName + "/one";

    const res = await this._tryOrLogout(axios.patch, 2, url, data, { params: ICrudQuery, headers: this._getHeaders() });

    return res;

  }

  async patchMany(query: object, data: any, options: ICrudOptions = undefined): Promise<FindResponseDto<T>> {
    const ICrudQuery: ICrudQuery = {      
      options: JSON.stringify(options) as any,
      query: JSON.stringify(query)
    }
    const url = this.url + "/crud/s/" + this.serviceName + "/many";

    const res = await this._tryOrLogout(axios.patch, 2, url, data, { params: ICrudQuery, headers: this._getHeaders() });

    return res;
  }

  async patchIn(q: any[] | object, data: any, options: ICrudOptions = undefined, copts: ClientOptions = {}): Promise<FindResponseDto<T>> {
    const url = this.url + "/crud/s/" + this.serviceName + "/in";
    let ids = [];
    let addToQuery = {}
    if(Array.isArray(q)){
      ids = q;
    }else{
      ids = q[this.id_field];
      addToQuery = q;
    }


    const ICrudQuery: ICrudQuery = {      
      options: JSON.stringify(options) as any,
    }

    const batchFunc = async (chunk: any[]) => {
      const newICrudQuery: ICrudQuery = {
        ...ICrudQuery,
        query: JSON.stringify({...addToQuery, [this.id_field]: chunk })
      }
      return await this._tryOrLogout(axios.patch, 2, url, data, { params: newICrudQuery, headers: this._getHeaders() });
    }

    const res = await this._doBatch(batchFunc, ids, copts.batchSize);

    return res;
  }

  async patchBatch(limitingFields: string[], objects: any[], options: ICrudOptions = undefined, copts: ClientOptions = {}): Promise<T[]> {

    const datas = objects.map(o => {
      let query, data;
      if (!limitingFields){
        [query, data] = this.processLimitingFields(this.limitingFields, query, data);
      } else {
        [query, data] = this.processLimitingFields(limitingFields, query, data);
      }
      return { query, data };
    });

    return await this._patchBatch(datas, copts.batchSize, options);

  }

  private _splitArrayIntoChunks(arr: any[], chunkSize: number): any[] {
    const chunks = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      chunks.push(arr.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async _patchBatch(datas: { query: any, data: any }[], batchSize = 5000, options: ICrudOptions = undefined): Promise<T[]> {
    const url = this.url + "/crud/s/" + this.serviceName + "/batch";

    const ICrudQuery: ICrudQuery = {      
      options: JSON.stringify(options) as any,
    }

    const batchFunc = async (chunk: any[]) => {
      this._tryOrLogout(axios.patch, 2, url, chunk, { params: ICrudQuery, headers: this._getHeaders() })
    }

    return await this._doBatch(batchFunc, datas, batchSize);
  }

  private async _doBatch(batchFunc: (datas) => any, datas, batchSize = 200, limited?){
    let res;

    let chunks = [datas];
    if (batchSize > 0) {
      chunks = this._splitArrayIntoChunks(datas, batchSize);
    }

    try {
      for (const chunk of chunks) {
        const r = await batchFunc(chunk);
        if(!res){
          res = limited ? r : _utils.makeArray(r);
        }else if(limited){
          res.data.push(..._utils.makeArray(r.data));
        }else{
          res.push(..._utils.makeArray(r));
        }
      }
    } catch (e) {
      if (e.response && e.response.status == 400) {
        const parsedMessage = JSON.parse(e.response.data);
        if ([CrudErrors.MAX_BATCH_SIZE_EXCEEDED.code, CrudErrors.IN_REQUIRED_LENGTH.code].includes(parsedMessage.code)) {
          const maxBatchSize = parsedMessage.data.maxBatchSize;
          if (maxBatchSize && (maxBatchSize < batchSize)) {
            return await this._doBatch(batchFunc, datas, maxBatchSize);
          }
        }
      }
      throw e;
    }

    return res;
  }

  async postBatch(objects: object[], options: ICrudOptions = undefined, copts: ClientOptions = {}): Promise<T[]> {
    const url = this.url + "/crud/s/" + this.serviceName + "/batch";

    const ICrudQuery: ICrudQuery = {      
      options: JSON.stringify(options) as any,
    }

    const batchFunc = async (chunk: any[]) => {
      this._tryOrLogout(axios.post, 2, url, chunk, { params: ICrudQuery, headers: this._getHeaders() })
    }

    return await this._doBatch(batchFunc, objects, copts.batchSize);  
  }

  async postOne(data: object, options: ICrudOptions = undefined): Promise<T> {
    const ICrudQuery: ICrudQuery = {      
      options: JSON.stringify(options) as any,
    }
    const url = this.url + "/crud/s/" + this.serviceName + "/one";

    const res = await this._tryOrLogout(axios.post, 2, url, data, { params: ICrudQuery, headers: this._getHeaders() });

    return res;
  }

  async deleteOne(query: object, options: ICrudOptions = undefined): Promise<1> {
    const ICrudQuery: ICrudQuery = {      
      options: JSON.stringify(options) as any,
      query: JSON.stringify(query)
    }
    const url = this.url + "/crud/s/" + this.serviceName + "/one";

    const res = await this._tryOrLogout(axios.delete, 1, url, { params: ICrudQuery, headers: this._getHeaders() });

    return res;

  }

  async deleteIn(ids: any[], options: ICrudOptions = undefined, copts: ClientOptions = {}): Promise<number> {
    const ICrudQuery: ICrudQuery = {      
      options: JSON.stringify(options) as any,
    }
    const url = this.url + "/crud/s/" + this.serviceName + "/in";
    
    const batchFunc = async (chunk: any[]) => {
      const newICrudQuery: ICrudQuery = {
        ...ICrudQuery,
        query: JSON.stringify({ [this.id_field]: chunk })
      }
      return await this._tryOrLogout(axios.delete, 1, url, { params: newICrudQuery, headers: this._getHeaders() });
    }

    const res = await this._doBatch(batchFunc, ids, copts.batchSize);

    return res?.reduce((acc, val) => acc + val, 0);
  }

  async deleteMany(query: object, options: ICrudOptions = undefined): Promise<number> {
    const ICrudQuery: ICrudQuery = {      
      options: JSON.stringify(options) as any,
      query: JSON.stringify(query)
    }
    const url = this.url + "/crud/s/" + this.serviceName + "/many";

    const res = await this._tryOrLogout(axios.delete, 1, url, { params: ICrudQuery, headers: this._getHeaders() });

    return res;
  }
  
  async cmd(cmdName: string, dto: any, options: ICrudOptions = undefined): Promise<any> {
    return await this._doCmd(cmdName, dto, options, false, false);
  }

  async cmdL(cmdName: string, dto: any, options: ICrudOptions = undefined): Promise<any> {
    return await this._doCmd(cmdName, dto, options, false, true);
  }

  async cmdS(cmdName: string, dto: any, options: ICrudOptions = undefined): Promise<any> {
    return await this._doCmd(cmdName, dto, options, true, false);
  }

  async cmdSL(cmdName: string, dto: any, options: ICrudOptions = undefined): Promise<any> {
    return await this._doCmd(cmdName, dto, options, true, true);
  }


}
