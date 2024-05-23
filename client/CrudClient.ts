import { set } from "mnemonist";
import { CrudOptions } from "../shared/CrudOptions";
import { CrudQuery } from "../shared/CrudQuery";
import { Cookies } from "js-cookie"
import { FindResponseDto } from "../shared/FindResponseDto";
import axios from "axios";
import { CrudErrors } from "../shared/CrudErrors";
import { LoginDto, LoginResponseDto } from "../shared/dtos";
import wildcard from "wildcard";

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


export interface ClientOptions { serviceName: string, url: string, storage?: ClientStorage, id_field?: string };

export class CrudClient<T> {

  JWT_COOKIE_KEY = "crud-client";

  serviceName: string;
  url: string;
  storage: ClientStorage;

  id_field: string;

  limitingFields: string[] = [];

  constructor(args: ClientOptions) {
    this.serviceName = args.serviceName;
    this.url = args.url;
    this.id_field = args.id_field || "id";
    this.storage = args.storage || (document ? new CookieStorage() : new MemoryStorage());
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

    }catch(e){
      if(e.response && e.response.status === 401){
        this.logout();
      }
    }
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
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
    this.storage.set(this.JWT_COOKIE_KEY, res.accessToken, days, false);
    return res;
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

  private async _doLimitQuery(fetchFunc: (q: CrudQuery) => Promise<FindResponseDto<any>>, crudQuery: CrudQuery) {
    const options = crudQuery.options;
    const res: FindResponseDto<any> = await fetchFunc(crudQuery);

    if (res.limit > 0 && (!options.limit || res.limit < options.limit) && res.total > res.limit) {
      let offset = res.limit;
      let total = options.limit || res.total;
      while (offset < total) {
        const newOptions: CrudOptions = { ...options, limit: res.limit, offset: res.limit };
        const newCrudQuery: CrudQuery = {
          ...crudQuery,
          options: newOptions,
        }
        const newRes: FindResponseDto<any> = await fetchFunc(newCrudQuery);
        res.data.push(...newRes.data);
        offset += res.limit;
      }
      res.limit = total;
    }

    return res;
  }

  async findOne(query: any, options: CrudOptions = undefined): Promise<T> {
    const crudQuery: CrudQuery = {
      service: this.serviceName,
      options: options,
      query: JSON.stringify(query)
    }
    const url = this.url + "/crud/one";

    const res = await this._tryOrLogout(axios.get, 1, url, { params: crudQuery, headers: this._getHeaders() });

    return res;
  }

  async find(query: any, options: CrudOptions = undefined): Promise<FindResponseDto<T>> {
    const crudQuery: CrudQuery = {
      service: this.serviceName,
      options: options,
      query: JSON.stringify(query)
    }
    const url = this.url + "/crud/many";

    async function fetchFunc(crdQuery: CrudQuery) {
      return await this._tryOrLogout(axios.get, 1, url, { params: crdQuery, headers: this._getHeaders() });
    }

    return await this._doLimitQuery(fetchFunc, crudQuery);

  }

  async findIn(ids: any[], options: CrudOptions = undefined, {batchSize = 0}): Promise<FindResponseDto<T>> {
    const crudQuery: CrudQuery = {
      service: this.serviceName,
      options: options,
    }
    const url = this.url + "/crud/in";

    async function batchFunc(chunk: any[]){
      const newCrudQuery: CrudQuery = {
        ...crudQuery,
        query: JSON.stringify({ [this.id_field]: chunk })
      }
      async function fetchFunc(crdQ: CrudQuery) {
        return await this._tryOrLogout(axios.get, 1, url, { params: crdQ, headers: this._getHeaders() });
      }
  
      return await this._doLimitQuery(fetchFunc, newCrudQuery);
    }

    return await this._doBatch(batchFunc, ids, batchSize);

  }

  async findIds(query: any, options: CrudOptions = undefined): Promise<FindResponseDto<string>> {
    const crudQuery: CrudQuery = {
      service: this.serviceName,
      options: options,
      query: JSON.stringify(query)
    }
    const url = this.url + "/crud/ids";

    async function fetchFunc(crdQ: CrudQuery) {
      return await this._tryOrLogout(axios.get, 1, url, { params: crdQ, headers: this._getHeaders() });
    }

    return await this._doLimitQuery(fetchFunc, crudQuery);
  }

  private async _doCmd(cmdName: string, dto: any, options: CrudOptions, secure: boolean, limited: boolean): Promise<any> {
    const crudQuery: CrudQuery = {
      service: this.serviceName,
      options: options,
      cmd: cmdName
    }
    const url = this.url + "/crud/cmd";

    const method = secure ? axios.post : axios.get;

    if (limited) {

      async function fetchFunc(crdQuery: CrudQuery) {
        return await this._tryOrLogout(method, 2, url, dto, { params: crdQuery, headers: this._getHeaders() });
      }

      return await this._doLimitQuery(fetchFunc, crudQuery);

    }

    const res = await this._tryOrLogout(secure ? axios.post : axios.patch, 2, url, dto, { params: crudQuery, headers: this._getHeaders() });

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

  async patchOne(q: object | string[], d: object, options: CrudOptions = undefined): Promise<T> {
    let query = {};
    let data = d;
    if (Array.isArray(q)) {
      [query, data] = this.processLimitingFields(q, query, data);
    }else if (q == null){
      [query, data] = this.processLimitingFields(this.limitingFields, query, data);
    } else {
      query = q;
    }
    const crudQuery: CrudQuery = {
      service: this.serviceName,
      options: options,
      query: JSON.stringify(query)
    }

    const url = this.url + "/crud/one";

    const res = await this._tryOrLogout(axios.patch, 2, url, data, { params: crudQuery, headers: this._getHeaders() });

    return res;

  }

  async patchMany(query: object, data: any, options: CrudOptions = undefined): Promise<FindResponseDto<T>> {
    const crudQuery: CrudQuery = {
      service: this.serviceName,
      options: options,
      query: JSON.stringify(query)
    }
    const url = this.url + "/crud/many";

    const res = await this._tryOrLogout(axios.patch, 2, url, data, { params: crudQuery, headers: this._getHeaders() });

    return res;
  }

  async patchIn(ids: any[], data: any, options: CrudOptions = undefined, { batchSize = 0 }): Promise<FindResponseDto<T>> {
    const url = this.url + "/crud/in";
    
    const crudQuery: CrudQuery = {
      service: this.serviceName,
      options: options,
    }

    async function batchFunc(chunk: any[]){
      const newCrudQuery: CrudQuery = {
        ...crudQuery,
        query: JSON.stringify({ [this.id_field]: chunk })
      }
      return await this._tryOrLogout(axios.patch, 2, url, data, { params: newCrudQuery, headers: this._getHeaders() });
    }

    const res = await this._doBatch(batchFunc, ids, batchSize);

    return res;
  }

  async patchBatch(limitingFields: string[], objects: any[], options: CrudOptions = undefined, { batchSize = 0 }): Promise<T[]> {

    const datas = objects.map(o => {
      let query, data;
      if (!limitingFields){
        [query, data] = this.processLimitingFields(this.limitingFields, query, data);
      } else {
        [query, data] = this.processLimitingFields(limitingFields, query, data);
      }
      return { query, data };
    });

    return await this._patchBatch(datas, batchSize, options);

  }

  private _splitArrayIntoChunks(arr: any[], chunkSize: number): any[] {
    const chunks = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      chunks.push(arr.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async _patchBatch(datas: { query: any, data: any }[], batchSize = 0, options: CrudOptions = undefined): Promise<T[]> {
    const url = this.url + "/crud/batch";

    const crudQuery: CrudQuery = {
      service: this.serviceName,
      options: options,
    }

    function batchFunc(chunk){
      this._tryOrLogout(axios.patch, 2, url, chunk, { params: crudQuery, headers: this._getHeaders() })
    }

    return await this._doBatch(batchFunc, datas, batchSize);
  }

  private async _doBatch(batchFunc: (datas) => any, datas, batchSize = 0){
    let res;

    let chunks = [datas];
    if (batchSize > 0) {
      chunks = this._splitArrayIntoChunks(datas, batchSize);
    }

    try {
      const res = [];
      for (const chunk of chunks) {
        const r = await batchFunc(chunk);
        res.push(...r);
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

  async postBatch(objects: object[], options: CrudOptions = undefined, { batchSize = 0 }): Promise<T[]> {
    const url = this.url + "/crud/batch";

    const crudQuery: CrudQuery = {
      service: this.serviceName,
      options: options,
    }

    function batchFunc(chunk){
      this._tryOrLogout(axios.post, 2, url, chunk, { params: crudQuery, headers: this._getHeaders() })
    }

    return await this._doBatch(batchFunc, objects, batchSize);  
  }

  async postOne(data: object, options: CrudOptions = undefined): Promise<T> {
    const crudQuery: CrudQuery = {
      service: this.serviceName,
      options: options,
    }
    const url = this.url + "/crud/one";

    const res = await this._tryOrLogout(axios.post, 2, url, data, { params: crudQuery, headers: this._getHeaders() });

    return res;
  }

  async deleteOne(query: object, options: CrudOptions = undefined): Promise<1> {
    const crudQuery: CrudQuery = {
      service: this.serviceName,
      options: options,
      query: JSON.stringify(query)
    }
    const url = this.url + "/crud/one";

    const res = await this._tryOrLogout(axios.delete, 1, url, { params: crudQuery, headers: this._getHeaders() });

    return res;

  }

  async delete(query: object, options: CrudOptions = undefined): Promise<number> {
    const crudQuery: CrudQuery = {
      service: this.serviceName,
      options: options,
      query: JSON.stringify(query)
    }
    const url = this.url + "/crud/many";

    const res = await this._tryOrLogout(axios.delete, 1, url, { params: crudQuery, headers: this._getHeaders() });

    return res;
  }

  async deleteIn(ids: any[], options: CrudOptions = undefined, { batchSize = 0 }): Promise<number> {
    const crudQuery: CrudQuery = {
      service: this.serviceName,
      options: options,
    }
    const url = this.url + "/crud/in";
    
    async function batchFunc(chunk: any[]){
      const newCrudQuery: CrudQuery = {
        ...crudQuery,
        query: JSON.stringify({ [this.id_field]: chunk })
      }
      return await this._tryOrLogout(axios.delete, 1, url, { params: newCrudQuery, headers: this._getHeaders() });
    }

    const res = await this._doBatch(batchFunc, ids, batchSize);

    return res?.reduce((acc, val) => acc + val, 0);
  }

  async deleteMany(query: object, options: CrudOptions = undefined): Promise<number> {
    const crudQuery: CrudQuery = {
      service: this.serviceName,
      options: options,
      query: JSON.stringify(query)
    }
    const url = this.url + "/crud/many";

    const res = await this._tryOrLogout(axios.delete, 1, url, { params: crudQuery, headers: this._getHeaders() });

    return res;
  }
  
  async cmd(cmdName: string, dto: any, options: CrudOptions = undefined): Promise<any> {
    return await this._doCmd(cmdName, dto, options, false, false);
  }

  async cmdL(cmdName: string, dto: any, options: CrudOptions = undefined): Promise<any> {
    return await this._doCmd(cmdName, dto, options, false, true);
  }

  async cmdS(cmdName: string, dto: any, options: CrudOptions = undefined): Promise<any> {
    return await this._doCmd(cmdName, dto, options, true, false);
  }

  async cmdSL(cmdName: string, dto: any, options: CrudOptions = undefined): Promise<any> {
    return await this._doCmd(cmdName, dto, options, true, true);
  }


}
