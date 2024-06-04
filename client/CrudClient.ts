import { ICrudOptions } from '../shared/interfaces';
import { ICrudQuery } from '../shared/interfaces';
import { Cookies } from 'js-cookie';
import { FindResponseDto } from '../shared/interfaces';
import axios from 'axios';
import { CrudErrors } from '../shared/CrudErrors';
import { ILoginDto, LoginResponseDto } from '../shared/interfaces';
import wildcard from 'wildcard';
import { _utils } from '../core/utils';

export interface ClientStorage {
  get(name: string): string;
  set(name: string, value: string, durationDays: number, secure: boolean): void;
  del(name: string): void;
}

export class CookieStorage implements ClientStorage {
  get(name: string): string {
    return Cookies.get(name);
  }
  set(
    name: string,
    value: string,
    durationDays: number,
    secure: boolean,
  ): void {
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  set(
    name: string,
    value: string,
    durationDays: number,
    secure: boolean,
  ): void {
    this.memory.set(name, value);
  }
  del(name: string): void {
    this.memory.delete(name);
  }
}

export interface ClientConfig {
  serviceName: string;
  url: string;
  onLogout?: () => void;
  storage?: ClientStorage;
  id_field?: string;
  globalMockRole?: string;
  defaultBatchSize?: number;
  cmdDefaultBatchMap?: {
    [key: string]: { batchField: string; batchSize?: number };
  };
  defaultProgressCallBack?: (
    progress: number,
    total: number,
    type: 'limit' | 'batch',
  ) => Promise<void>;
  limitingFields?: string[];
}

export interface ClientOptions {
  batchSize?: number;
  batchField?: string;
  progressCallBack?: (
    progress: number,
    total: number,
    type: 'limit' | 'batch',
  ) => Promise<void>;
}

/**
 * A client for CRUD operations.
 */
export class CrudClient<T> {
  JWT_COOKIE_KEY = 'crud-client';
  fetchNb = 0;

  constructor(public config: ClientConfig) {
    this.config.id_field = this.config.id_field || 'id';
    this.config.storage =
      this.config.storage ||
      (document ? new CookieStorage() : new MemoryStorage());
    this.config.defaultBatchSize = this.config.defaultBatchSize || 200;
    this.config.cmdDefaultBatchMap = this.config.cmdDefaultBatchMap || {};
  }

  private _getHeaders() {
    const headers: any = {};
    const jwt = this.config.storage.get(this.JWT_COOKIE_KEY);
    if (jwt) {
      headers.Authorization = `Bearer ${jwt}`;
    }
    return headers;
  }

  logout() {
    this.config.storage.del(this.JWT_COOKIE_KEY);
    this.config.onLogout?.();
  }

  async checkToken() {
    const url = this.config.url + '/crud/auth';
    try {
      const res: LoginResponseDto = await axios.get(url, {
        headers: this._getHeaders(),
      });

      if (res.refreshTokenSec) {
        let days = Math.round(res.refreshTokenSec / 60 / 60 / 24);
        if (days < 1) {
          days = 1;
        }
        this.config.storage.set(
          this.JWT_COOKIE_KEY,
          res.accessToken,
          days,
          false,
        );
      }

      return res.userId;
    } catch (e) {
      if (e.response && e.response.status === 401) {
        this.logout();
      }
    }
  }

  async login(dto: ILoginDto): Promise<LoginResponseDto> {
    const url = this.config.url + '/crud/auth';

    let res: LoginResponseDto = (await axios.post(url, dto)).data;
    let days = 1;
    if (dto.expiresIn?.includes('d')) {
      const dayStr = dto.expiresIn.replace('d', '');
      const dayNum = parseInt(dayStr);
      if (dayNum > 0) {
        days = dayNum;
      }
    }
    this.setJwt(res.accessToken, days);
    return res;
  }

  setJwt(jwt: string, durationDays: number = 1) {
    this.config.storage.set(this.JWT_COOKIE_KEY, jwt, durationDays, true);
  }

  private async _tryOrLogout(method, optsIndex, ...args) {
    let res;
    try {
      res = await method(...args);
      this.fetchNb++;
    } catch (e) {
      if (e.response && e.response.status === 401) {
        this.logout();
      } else {
        throw e;
      }
      args[optsIndex] = {
        ...args[optsIndex],
        headers: this._getHeaders(),
      };
      res = await method(...args);
    }
    return res.data;
  }

  private async _doLimitQuery(
    fetchFunc: (q: ICrudQuery) => Promise<FindResponseDto<any>>,
    ICrudQuery: ICrudQuery,
    copts: ClientOptions,
  ) {
    const options = ICrudQuery.options || {};
    const res: FindResponseDto<any> = await fetchFunc({
      ...ICrudQuery,
      options: JSON.stringify(options) as any,
    });

    if (
      res?.limit > 0 &&
      (!options.limit || res.limit < options.limit) &&
      res.total > res.limit
    ) {
      let offset = res.limit;
      let total = options.limit || res.total;
      while (offset < total) {
        const newOptions: ICrudOptions = {
          ...options,
          limit: res.limit,
          offset,
        };
        const newICrudQuery: ICrudQuery = {
          ...ICrudQuery,
          options: JSON.stringify(newOptions) as any,
        };
        const newRes: FindResponseDto<any> = await fetchFunc(newICrudQuery);
        const callBack =
          copts?.progressCallBack || this.config.defaultProgressCallBack;
        callBack?.(offset, total, 'limit');
        res.data.push(...newRes.data);
        offset += res.limit;
      }
      res.limit = total;
    }

    return res;
  }

  async findOne(query: any, options: ICrudOptions = {}): Promise<T> {
    options.mockRole = this.config.globalMockRole;
    const ICrudQuery: ICrudQuery = {
      options: JSON.stringify(options) as any,
      query: JSON.stringify(query),
    };
    const url = this.config.url + '/crud/s/' + this.config.serviceName + '/one';

    const res = await this._tryOrLogout(axios.get, 1, url, {
      params: ICrudQuery,
      headers: this._getHeaders(),
    });

    return res;
  }

  async find(
    query: any,
    options: ICrudOptions = undefined,
    copts?: ClientOptions,
  ): Promise<FindResponseDto<T>> {
    const ICrudQuery: ICrudQuery = {
      options: options,
      query: JSON.stringify(query),
    };
    const url =
      this.config.url + '/crud/s/' + this.config.serviceName + '/many';

    const fetchFunc = async (crdQuery: ICrudQuery) => {
      return await this._tryOrLogout(axios.get, 1, url, {
        params: crdQuery,
        headers: this._getHeaders(),
      });
    };

    return await this._doLimitQuery(fetchFunc, ICrudQuery, copts);
  }

  async findIn(
    q: any[] | object,
    options: ICrudOptions = undefined,
    copts?: ClientOptions,
  ): Promise<FindResponseDto<T>> {
    const ICrudQuery: ICrudQuery = {
      options: options,
    };
    let ids = [];
    let addToQuery = {};
    if (Array.isArray(q)) {
      ids = q;
    } else {
      ids = q[this.config.id_field];
      addToQuery = q;
    }

    const url = this.config.url + '/crud/s/' + this.config.serviceName + '/in';

    const batchFunc = async (chunk: any[]) => {
      const newICrudQuery: ICrudQuery = {
        ...ICrudQuery,
        query: JSON.stringify({ ...addToQuery, [this.config.id_field]: chunk }),
      };
      const fetchFunc = async (crdQ: ICrudQuery) => {
        return await this._tryOrLogout(axios.get, 1, url, {
          params: crdQ,
          headers: this._getHeaders(),
        });
      };

      return await this._doLimitQuery(fetchFunc, newICrudQuery, copts);
    };

    return await this._doBatch(batchFunc, ids, copts, true);
  }

  async findIds(
    query: any,
    options: ICrudOptions = undefined,
    copts?: ClientOptions,
  ): Promise<FindResponseDto<string>> {
    const ICrudQuery: ICrudQuery = {
      options: options,
      query: JSON.stringify(query),
    };
    const url = this.config.url + '/crud/s/' + this.config.serviceName + '/ids';

    const fetchFunc = async (crdQ: ICrudQuery) => {
      return await this._tryOrLogout(axios.get, 1, url, {
        params: crdQ,
        headers: this._getHeaders(),
      });
    };

    return await this._doLimitQuery(fetchFunc, ICrudQuery, copts);
  }

  private async _doCmd(
    cmdName: string,
    dto: any,
    options: ICrudOptions,
    secure: boolean,
    limited: boolean,
    copts: ClientOptions = {},
  ): Promise<any> {
    const crudQuery: ICrudQuery = {
      options: options,
    };
    const url =
      this.config.url +
      '/crud/s/' +
      this.config.serviceName +
      '/cmd/' +
      cmdName;

    const method = secure ? axios.post : axios.patch;

    const mapped = this.config.cmdDefaultBatchMap?.[cmdName];
    copts.batchField = copts.batchField || mapped?.batchField;
    copts.batchSize = copts.batchSize || mapped?.batchSize;

    return this._doCmdOrBatch(
      dto,
      options,
      method,
      url,
      crudQuery,
      limited,
      copts,
    );
  }

  private async _doCmdOrBatch(
    dto: any,
    options: ICrudOptions,
    method,
    url,
    crudQuery: ICrudQuery,
    limited: boolean,
    copts: ClientOptions,
  ) {
    try {
      if (copts.batchField && dto[copts.batchField]) {
        const batchFunc = async (chunk: any[]) => {
          const newDto = { ...dto, [copts.batchField]: chunk };
          return await this._subDoCmd(
            method,
            url,
            newDto,
            options,
            crudQuery,
            limited,
            copts,
          );
        };
        return await this._doBatch(
          batchFunc,
          dto[copts.batchField],
          copts,
          limited,
        );
      }
      return await this._subDoCmd(
        method,
        url,
        dto,
        options,
        crudQuery,
        limited,
        copts,
      );
    } catch (e) {
      const detected = this._detectMatchBatchSize(e, copts);
      if (detected) {
        const newOpts: ClientOptions = {
          ...copts,
          batchSize: detected.maxBatchSize,
          batchField: detected.field,
        };
        return await this._doCmdOrBatch(
          dto,
          options,
          method,
          url,
          crudQuery,
          limited,
          newOpts,
        );
      }
      throw e;
    }
  }

  private async _subDoCmd(
    method,
    url,
    dto: any,
    options: ICrudOptions,
    crudQuery: ICrudQuery,
    limited: boolean,
    copts: ClientOptions,
  ): Promise<any> {
    if (limited) {
      const fetchFunc = async (crdQ: ICrudQuery) => {
        return await this._tryOrLogout(method, 2, url, dto, {
          params: crdQ,
          headers: this._getHeaders(),
        });
      };
      return await this._doLimitQuery(fetchFunc, crudQuery, copts);
    }

    crudQuery.options = JSON.stringify(options) as any;
    return await this._tryOrLogout(method, 2, url, dto, {
      params: crudQuery,
      headers: this._getHeaders(),
    });
  }

  /**
   * Moves data fields to query if they are in limitingFields. If a limiting field is prefixed with '!', it will only be deleted.
   * @param {Array} limitingFields
   * @param query
   * @param data
   * @returns [query, data]
   * @example processLimitingFields(['id', '!name'], {}, { id: 1, name: 'John', age: 30 }) => [{ id: 1, }, { age: 30 } ]
   */
  processLimitingFields(
    limitingFields: string[],
    query: object,
    data: object,
  ): [object, object] {
    if (!limitingFields.includes(this.config.id_field)) {
      limitingFields.push(this.config.id_field);
    }
    for (const f of limitingFields) {
      let deleteField = false;
      let match = f;
      if (f.startsWith('!')) {
        deleteField = true;
        match = f.substring(1);
      }
      for (const key in data) {
        if (wildcard(match, key)) {
          if (!deleteField) {
            query[key] = data[key];
          }
          delete data[key];
        }
      }
    }
    return [query, data];
  }

  async patchOne(
    q: object | string[],
    d: object,
    options: ICrudOptions = undefined,
  ): Promise<T> {
    let query = {};
    let data = d;
    if (Array.isArray(q)) {
      [query, data] = this.processLimitingFields(q, query, data);
    } else if (q == null) {
      [query, data] = this.processLimitingFields(
        this.config.limitingFields,
        query,
        data,
      );
    } else {
      query = q;
    }
    const ICrudQuery: ICrudQuery = {
      options: JSON.stringify(options) as any,
      query: JSON.stringify(query),
    };

    const url = this.config.url + '/crud/s/' + this.config.serviceName + '/one';

    const res = await this._tryOrLogout(axios.patch, 2, url, data, {
      params: ICrudQuery,
      headers: this._getHeaders(),
    });

    return res;
  }

  async patch(
    query: object,
    data: any,
    options: ICrudOptions = undefined,
  ): Promise<FindResponseDto<T>> {
    const ICrudQuery: ICrudQuery = {
      options: JSON.stringify(options) as any,
      query: JSON.stringify(query),
    };
    const url =
      this.config.url + '/crud/s/' + this.config.serviceName + '/many';

    const res = await this._tryOrLogout(axios.patch, 2, url, data, {
      params: ICrudQuery,
      headers: this._getHeaders(),
    });

    return res;
  }

  async patchIn(
    q: any[] | object,
    data: any,
    options: ICrudOptions = undefined,
    copts?: ClientOptions,
  ): Promise<FindResponseDto<T>> {
    const url = this.config.url + '/crud/s/' + this.config.serviceName + '/in';
    let ids = [];
    let addToQuery = {};
    if (Array.isArray(q)) {
      ids = q;
    } else {
      ids = q[this.config.id_field];
      addToQuery = q;
    }

    const ICrudQuery: ICrudQuery = {
      options: JSON.stringify(options) as any,
    };

    const batchFunc = async (chunk: any[]) => {
      const newICrudQuery: ICrudQuery = {
        ...ICrudQuery,
        query: JSON.stringify({ ...addToQuery, [this.config.id_field]: chunk }),
      };
      return await this._tryOrLogout(axios.patch, 2, url, data, {
        params: newICrudQuery,
        headers: this._getHeaders(),
      });
    };

    const res = await this._doBatch(batchFunc, ids, copts);

    return res;
  }

  async saveBatch(
    limitingFields: string[],
    objects: any[],
    options: ICrudOptions = undefined,
    copts?: ClientOptions,
  ): Promise<T[]> {
    const datas = objects.map((o) => {
      let query, data;
      if (!limitingFields) {
        [query, data] = this.processLimitingFields(
          this.config.limitingFields,
          query,
          data,
        );
      } else {
        [query, data] = this.processLimitingFields(limitingFields, query, data);
      }
      return { query, data };
    });

    return await this.patchBatch(datas, options, copts);
  }

  private _splitArrayIntoChunks(arr: any[], chunkSize: number): any[] {
    const chunks = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      chunks.push(arr.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async patchBatch(
    datas: { query: any; data: any }[],
    options: ICrudOptions = undefined,
    copts?: ClientOptions,
  ): Promise<T[]> {
    const url =
      this.config.url + '/crud/s/' + this.config.serviceName + '/batch';

    const ICrudQuery: ICrudQuery = {
      options: JSON.stringify(options) as any,
    };

    const batchFunc = async (chunk: any[]) => {
      this._tryOrLogout(axios.patch, 2, url, chunk, {
        params: ICrudQuery,
        headers: this._getHeaders(),
      });
    };

    return await this._doBatch(batchFunc, datas, copts);
  }

  private async _doBatch(
    batchFunc: (datas) => any,
    datas,
    copts: ClientOptions = {},
    limited?,
  ) {
    let res;
    let chunks = [datas];
    if (!copts.batchSize) {
      copts.batchSize = this.config.defaultBatchSize;
    }
    if (copts.batchSize > 0) {
      chunks = this._splitArrayIntoChunks(datas, copts.batchSize);
    }

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const r = await batchFunc(chunk);
        const callBack =
          copts?.progressCallBack || this.config.defaultProgressCallBack;
        callBack?.(i, chunks.length, 'batch');
        if (!res) {
          res = limited ? r : _utils.makeArray(r);
        } else if (limited) {
          res.total += r.total;
          res.data.push(..._utils.makeArray(r.data));
        } else {
          res.push(..._utils.makeArray(r));
        }
      }
    } catch (e) {
      const detected = this._detectMatchBatchSize(e, copts);
      if (detected) {
        const newOpts = { ...copts, batchSize: detected.maxBatchSize };
        return await this._doBatch(batchFunc, datas, newOpts, limited);
      }
      throw e;
    }

    return res;
  }

  private _detectMatchBatchSize(e, copts: ClientOptions) {
    if (e.response && e.response.status == 400) {
      let parsedMessage = e.response.data?.message;
      if (typeof parsedMessage == 'string') {
        parsedMessage = JSON.parse(parsedMessage);
      }
      if (
        [
          CrudErrors.MAX_BATCH_SIZE_EXCEEDED.code,
          CrudErrors.IN_REQUIRED_LENGTH.code,
        ].includes(parsedMessage?.code)
      ) {
        const maxBatchSize = parsedMessage.data?.maxBatchSize;
        if (
          maxBatchSize &&
          (!copts.batchSize || maxBatchSize < copts.batchSize)
        ) {
          //console.warn("Batch size exceeded, reducing batch size to", maxBatchSize);
          return parsedMessage.data;
        }
      }
    }
    return null;
  }

  async createBatch(
    objects: object[],
    options: ICrudOptions = undefined,
    copts?: ClientOptions,
  ): Promise<T[]> {
    const url =
      this.config.url + '/crud/s/' + this.config.serviceName + '/batch';

    const ICrudQuery: ICrudQuery = {
      options: JSON.stringify(options) as any,
    };

    const batchFunc = async (chunk: any[]) => {
      this._tryOrLogout(axios.post, 2, url, chunk, {
        params: ICrudQuery,
        headers: this._getHeaders(),
      });
    };

    return await this._doBatch(batchFunc, objects, copts);
  }

  async create(data: object, options: ICrudOptions = undefined): Promise<T> {
    const ICrudQuery: ICrudQuery = {
      options: JSON.stringify(options) as any,
    };
    const url = this.config.url + '/crud/s/' + this.config.serviceName + '/one';

    const res = await this._tryOrLogout(axios.post, 2, url, data, {
      params: ICrudQuery,
      headers: this._getHeaders(),
    });

    return res;
  }

  async removeOne(
    query: object,
    options: ICrudOptions = undefined,
  ): Promise<1> {
    const ICrudQuery: ICrudQuery = {
      options: JSON.stringify(options) as any,
      query: JSON.stringify(query),
    };
    const url = this.config.url + '/crud/s/' + this.config.serviceName + '/one';

    const res = await this._tryOrLogout(axios.delete, 1, url, {
      params: ICrudQuery,
      headers: this._getHeaders(),
    });

    return res;
  }

  async removeIn(
    ids: any[],
    options: ICrudOptions = undefined,
    copts?: ClientOptions,
  ): Promise<number> {
    const ICrudQuery: ICrudQuery = {
      options: JSON.stringify(options) as any,
    };
    const url = this.config.url + '/crud/s/' + this.config.serviceName + '/in';

    const batchFunc = async (chunk: any[]) => {
      const newICrudQuery: ICrudQuery = {
        ...ICrudQuery,
        query: JSON.stringify({ [this.config.id_field]: chunk }),
      };
      return await this._tryOrLogout(axios.delete, 1, url, {
        params: newICrudQuery,
        headers: this._getHeaders(),
      });
    };

    const res = await this._doBatch(batchFunc, ids, copts);

    return res?.reduce((acc, val) => acc + val, 0);
  }

  async remove(
    query: object,
    options: ICrudOptions = undefined,
  ): Promise<number> {
    const ICrudQuery: ICrudQuery = {
      options: JSON.stringify(options) as any,
      query: JSON.stringify(query),
    };
    const url =
      this.config.url + '/crud/s/' + this.config.serviceName + '/many';

    const res = await this._tryOrLogout(axios.delete, 1, url, {
      params: ICrudQuery,
      headers: this._getHeaders(),
    });

    return res;
  }

  async cmd(
    cmdName: string,
    dto: any,
    options: ICrudOptions = undefined,
    copts?: ClientOptions,
  ): Promise<any> {
    return await this._doCmd(cmdName, dto, options, false, false, copts);
  }

  async cmdL(
    cmdName: string,
    dto: any,
    options: ICrudOptions = undefined,
    copts?: ClientOptions,
  ): Promise<FindResponseDto<T>> {
    return await this._doCmd(cmdName, dto, options, false, true, copts);
  }

  async cmdS(
    cmdName: string,
    dto: any,
    options: ICrudOptions = undefined,
    copts?: ClientOptions,
  ): Promise<any> {
    return await this._doCmd(cmdName, dto, options, true, false, copts);
  }

  async cmdSL(
    cmdName: string,
    dto: any,
    options: ICrudOptions = undefined,
    copts?: ClientOptions,
  ): Promise<FindResponseDto<T>> {
    return await this._doCmd(cmdName, dto, options, true, true, copts);
  }
}
