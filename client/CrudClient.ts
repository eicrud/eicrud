import { ICrudOptions } from '@eicrud/shared/interfaces';
import { ICrudQuery } from '@eicrud/shared/interfaces';
import { FindResponseDto } from '@eicrud/shared/interfaces';
import axios from 'axios';
import { CrudErrors } from '@eicrud/shared/CrudErrors';
import { ILoginDto, LoginResponseDto } from '@eicrud/shared/interfaces';
let wildcard = require('wildcard');
let Cookie = require('js-cookie');

class _utils {
  static makeArray(obj) {
    return Array.isArray(obj) ? obj : [obj];
  }
}

export interface ClientStorage {
  get(name: string): string;
  set(
    name: string,
    value: string,
    durationSeconds: number,
    secure: boolean,
  ): void;
  del(name: string): void;
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
    durationSeconds: number,
    secure: boolean,
  ): void {
    this.memory.set(name, value);
  }
  del(name: string): void {
    this.memory.delete(name);
  }
}

export class LocalStorage implements ClientStorage {
  get(name: string): string {
    return localStorage.getItem(name);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  set(
    name: string,
    value: string,
    durationSeconds: number,
    secure: boolean,
  ): void {
    if (!value) {
      localStorage.removeItem(name);
    } else {
      localStorage.setItem(name, value);
    }
  }
  del(name: string): void {
    localStorage.removeItem(name);
  }
}

export type SuperClientConfig = Omit<ClientConfig, 'serviceName'>;

export interface ClientConfig {
  serviceName: string;
  url: string;
  allowNonSecureUrl?: boolean;
  userServiceName?: string;
  onLogout?: () => void;
  storage?: ClientStorage;
  useSecureCookie?: boolean;
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
  globalOptions?: ICrudOptions;
  globalHeaders?: any;
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
  JWT_STORAGE_KEY = 'eicrud-jwt';
  fetchNb = 0;
  sessionStorage = typeof document !== 'undefined' ? sessionStorage : null;

  constructor(public config: ClientConfig) {
    if (typeof document !== 'undefined' && !this.config.useSecureCookie) {
      console.warn(
        'Warning: you are using local storage to store JWT tokens. Consider switching to secure cookie before production. See https://docs.eicrud.com/client/jwt-storage',
      );
    }

    this.config.id_field = this.config.id_field || 'id';
    this.config.storage =
      this.config.storage ||
      (typeof document !== 'undefined'
        ? this.config.useSecureCookie
          ? null
          : new LocalStorage()
        : new MemoryStorage());
    this.config.defaultBatchSize = this.config.defaultBatchSize || 200;
    this.config.cmdDefaultBatchMap = this.config.cmdDefaultBatchMap || {};
    this.config.userServiceName = this.config.userServiceName || 'user';

    if (!this.config.storage) {
      this.config.globalOptions = this.config.globalOptions || {};
      this.config.globalOptions.jwtCookie = true;
    }
  }

  private _checkHttps() {
    const mustStartWith = [
      'https://',
      'http://localhost',
      'localhost',
      'http://127.0.0.1',
      '127.0.0.1',
    ];
    if (
      !this.config.allowNonSecureUrl &&
      !mustStartWith.some((v) => this.config.url.startsWith(v))
    ) {
      throw new Error(
        'allowNonSecureUrl not set, but url is not secure - cannot send credentials over non-secure connection.',
      );
    }
  }

  private _getAxiosOptions() {
    const headers: any = { ...(this.config.globalHeaders || {}) };

    if (this.config.storage) {
      const jwt =
        this.sessionStorage?.getItem(this.JWT_STORAGE_KEY) ||
        this.config.storage?.get(this.JWT_STORAGE_KEY);
      if (jwt) {
        this._checkHttps();
        headers.Authorization = 'Bearer ' + jwt;
      }
    } else {
      const csrf = Cookie.get('eicrud-csrf');
      if (csrf) {
        this._checkHttps();
        headers['eicrud-csrf'] = csrf;
      }
    }
    return {
      headers,
      withCredentials: this.config.useSecureCookie,
    };
  }

  async logout(remote = true) {
    let result;
    this.sessionStorage?.removeItem(this.JWT_STORAGE_KEY);
    if (this.config.storage) {
      this.config.storage.del(this.JWT_STORAGE_KEY);
    } else if (remote) {
      result = await this.userServiceCmd('logout', {}, true);
    }
    this.config.onLogout?.();
    return result;
  }

  async userServiceCmd(
    cmdName,
    data = {},
    returnRaw = false,
    retryAsGuest = false,
  ) {
    const url =
      this.config.url +
      '/crud/s/' +
      this.config.userServiceName +
      '/cmd/' +
      cmdName;
    try {
      const globalOptions = this.config.globalOptions;
      const res = await axios.patch(url, data, {
        params: {
          options: globalOptions
            ? (JSON.stringify(globalOptions) as any)
            : undefined,
        },
        ...this._getAxiosOptions(),
      });

      return returnRaw ? res : res?.data;
    } catch (e) {
      if (e.response && e.response.status === 401) {
        console.error(e.response?.data);
        this.logout(false);
        if (retryAsGuest) {
          return await this.userServiceCmd(cmdName, data, returnRaw);
        }
        if (returnRaw) return e;
      } else {
        this.checkDevLog(e);
        throw e;
      }
    }
    return null;
  }

  async checkJwt() {
    const res: LoginResponseDto = await this.userServiceCmd('check_jwt');
    if (res?.accessToken) {
      this.setJwt(res.accessToken, res.refreshTokenSec);
    }
    return res?.userId || null;
  }

  async login(dto: ILoginDto, returnRaw = false): Promise<any> {
    const response = await this.userServiceCmd('login', dto, true, false);
    let res: LoginResponseDto = response?.data;
    let secs = dto.expiresInSec;
    this.setJwt(res?.accessToken, secs);
    return returnRaw ? response : res;
  }

  setJwt(jwt: string, durationSeconds?: number) {
    this.sessionStorage?.removeItem(this.JWT_STORAGE_KEY);
    if (this.config.storage) {
      if (durationSeconds || !this.sessionStorage) {
        this.config.storage.set(
          this.JWT_STORAGE_KEY,
          jwt,
          durationSeconds,
          true,
        );
      } else if (jwt) {
        this.sessionStorage.setItem(this.JWT_STORAGE_KEY, jwt);
      }
    }
  }

  private async _tryOrLogout(method, optsIndex, ...args) {
    let res;

    const globalOptions = this.config.globalOptions;
    if (globalOptions) {
      let oldOptions = args[optsIndex]?.options;
      if (oldOptions) {
        oldOptions = JSON.parse(oldOptions);
      }
      const newOptions = { ...globalOptions, ...(oldOptions || {}) };
      args[optsIndex] = {
        ...args[optsIndex],
        options: JSON.stringify(newOptions) as any,
      };
    }

    try {
      res = await method(...args);
      this.fetchNb++;
    } catch (e) {
      if (e.response && e.response.status === 401) {
        this.logout(false);
      } else {
        this.checkDevLog(e);
        throw e;
      }
      args[optsIndex] = {
        ...args[optsIndex],
        ...this._getAxiosOptions(),
      };
      res = await method(...args);
    }
    return res.data;
  }
  checkDevLog(e: any) {
    const NODE_ENV = process?.env?.NODE_ENV;
    if (NODE_ENV && (NODE_ENV.includes('dev') || NODE_ENV.includes('test'))) {
      console.error(e.response?.data);
    }
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

  async findOne(query: Partial<T>, options: ICrudOptions = {}): Promise<T> {
    options.mockRole = this.config.globalMockRole;
    const ICrudQuery: ICrudQuery = {
      options: JSON.stringify(options) as any,
      query: JSON.stringify(query),
    };
    const url = this.config.url + '/crud/s/' + this.config.serviceName + '/one';

    const res = await this._tryOrLogout(axios.get, 1, url, {
      params: ICrudQuery,
      ...this._getAxiosOptions(),
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
        ...this._getAxiosOptions(),
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
          ...this._getAxiosOptions(),
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
        ...this._getAxiosOptions(),
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
          ...this._getAxiosOptions(),
        });
      };
      return await this._doLimitQuery(fetchFunc, crudQuery, copts);
    }

    crudQuery.options = JSON.stringify(options) as any;
    return await this._tryOrLogout(method, 2, url, dto, {
      params: crudQuery,
      ...this._getAxiosOptions(),
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
      ...this._getAxiosOptions(),
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
      ...this._getAxiosOptions(),
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
        ...this._getAxiosOptions(),
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
      let query = {};
      let data = {};
      if (!limitingFields) {
        [query, data] = this.processLimitingFields(
          this.config.limitingFields,
          query,
          o,
        );
      } else {
        [query, data] = this.processLimitingFields(limitingFields, query, o);
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
      return await this._tryOrLogout(axios.patch, 2, url, chunk, {
        params: ICrudQuery,
        ...this._getAxiosOptions(),
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
        try {
          parsedMessage = JSON.parse(parsedMessage);
        } catch (e) {
          return null;
        }
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
      return await this._tryOrLogout(axios.post, 2, url, chunk, {
        params: ICrudQuery,
        ...this._getAxiosOptions(),
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
      ...this._getAxiosOptions(),
    });

    return res;
  }

  async deleteOne(
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
      ...this._getAxiosOptions(),
    });

    return res;
  }

  async deleteIn(
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
        ...this._getAxiosOptions(),
      });
    };

    const res = await this._doBatch(batchFunc, ids, copts);

    return res?.reduce((acc, val) => acc + val, 0);
  }

  async delete(
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
      ...this._getAxiosOptions(),
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
  ): Promise<FindResponseDto<any>> {
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
  ): Promise<FindResponseDto<any>> {
    return await this._doCmd(cmdName, dto, options, true, true, copts);
  }
}
