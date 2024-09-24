import { CmdHooks } from '../../crud';
import { CrudContext } from '../../crud/model/CrudContext';
import { AbilityBuilder, createAliasResolver } from '@casl/ability';

/**
 * Security applied to a cmd.
 */
export interface CmdSecurity<
  TDto = any,
  TEntity = any,
  TReturnDto = any,
  TRoleType extends string = string,
> {
  /**
   * Allow guest to use command always
   * @usageNotes
   * Use when command has no security, increase authorization performance.
   * @type {boolean}
   * @public
   */
  guestCanUseAll?: boolean;

  /**
   * Min required time between cmd calls (for a specific user)
   * @usageNotes
   * Must be used with {@link secureOnly} to be effective.
   * This is not very accurate and may allow multiple cmd call under extreme conditions (DDOS), implement your own rate limiting if time between cmd call is critical.
   * @type {number}
   * @public
   */
  minTimeBetweenCmdCallMs?: number;

  /**
   * Max number of times a user can call the cmd
   * @type {number}
   * @public
   */
  maxUsesPerUser?: number;
  /**
   * Adds (X * user.trust) to {@link maxUsesPerUser} when checking create permissions
   * @usageNotes
   * Use when you want to gradually increase the number of uses for trusted users.
   * @type {number}
   * @public
   */
  additionalUsesPerTrustPoint?: number;
  /**
   * If true, cmd can only be called in secure mode (POST)
   * @usageNotes
   * Use when you need a non-cached ctx.user inside your cmd.
   * @type {boolean}
   */
  secureOnly?: boolean;
  /**
   * DTO class to use for the cmd arguments (ctx.data).
   * @usageNotes
   * - Cannot use `class-transformer` decorators in the DTO class.
   * - Can use `class-validator` & `eicrud` decorators.
   */
  dto: { new (): any };

  /**
   * Max find limit for non admin users
   * @usageNotes
   * Useful for search cmds that returns limited results (ex: search cmd).
   * @type {number}
   */
  nonAdminQueryLimit?: number;

  /**
   * Max find limit for admin users
   * @usageNotes
   * Useful for search cmds that returns limited results (ex: search cmd).
   * @type {number}
   */
  adminQueryLimit?: number;

  /**
   *  The batch field name in the dto if present.
   *  @type {string}
   */
  batchField?: keyof TDto;

  /**
   * Allow the command to be used with GET methods.
   * @usageNotes
   * Usefull for triggering a command with a simple URL.
   * @warning
   * CSRF protection is not enforced on GET requests, make sure your command doesn't change your application state when enabling this.
   *
   */
  allowGetMethod?: boolean;

  rolesRights?: Partial<Record<TRoleType, CmdSecurityRights<TDto, TEntity>>>;

  hooks?: CmdHooks<TDto, TReturnDto>;
}

export type CanCannot<T, A = string> = (
  action: A,
  subject: string,
  a?: string | string[] | Partial<T>,
  b?: Partial<T>,
) => void;

export interface CmdSecurityRights<TDto = any, TEntity = any> {
  /**
   *  The max allowed length of the batch array (specified with the batchField)
   *  @type {number}
   */
  maxBatchSize?: number;

  fields?: (keyof TEntity)[];

  defineCMDAbility?(
    can: CanCannot<TDto>,
    cannot: CanCannot<TDto>,
    ctx: CrudContext,
  ): Promise<any>;

  defineOPTAbility?(
    can: CanCannot<TDto>,
    cannot: CanCannot<TDto>,
    ctx: CrudContext,
  ): Promise<any>;
}

/**
 * Security applied to a service
 */
export class CrudSecurity<T = any, TRoleType extends string = string> {
  /**
   * Allow guest to read all entities
   * @usageNotes
   * Use when all entities in the service are public, increase read performance
   * @type {boolean}
   * @public
   */
  guestCanReadAll?: boolean;

  /**
   * Max number of entities allowed in the db
   * @type {number}
   * @public
   */
  maxItemsInDb?: number;

  /**
   * List of fields that are always excluded from the response
   * @type {string[]}
   * @public
   */
  alwaysExcludeFields?: string[];

  /**
   * Max number of entities a user can create in the db
   * @type {number}
   * @public
   */
  maxItemsPerUser?: number;

  /**
   * Adds (X * user.trust) to {@link maxItemsPerUser} when checking create permissions
   * @usageNotes
   * Use when you want to gradually increase the number of max entities allowed for trusted users.
   * @type {number}
   * @public
   */
  additionalItemsInDbPerTrustPoints?: number;

  /**
   * Map of {@link CmdSecurity}.
   * @example
   * { 'cmd_name': { secureOnly: true, dto: CmdDto } }
   *
   * @type {Record<string, CmdSecurity>}
   * @public
   */
  cmdSecurityMap?: Record<string, CmdSecurity<any, T, any, TRoleType>> = {};

  /**
   * Map of {@link CrudSecurityRights}.
   * @example
   * {
   *   'super_admin': {
   *       async defineCRUDAbility(can, cannot, ctx) {
   *          can('crud', 'service_name');
   *       },
   *   },
   * }
   * @type {Record<string, CrudSecurityRights>}
   * @public
   */
  rolesRights?: Partial<Record<TRoleType, CrudSecurityRights<T>>> = {};
}

interface CrudAction {
  create: string[];
  read: string[];
  update: string[];
  delete: string[];
  crud: string[];
  cru: string[];
  crd: string[];
  cud: string[];
  rud: string[];
  cr: string[];
  cu: string[];
  cd: string[];
  ru: string[];
  rd: string[];
  ud: string[];
}

const actions: CrudAction = {
  create: ['POST'],
  read: ['GET'],
  update: ['PATCH'],
  delete: ['DELETE'],
  crud: ['POST', 'GET', 'PATCH', 'DELETE'],
  cru: ['POST', 'GET', 'PATCH'],
  crd: ['POST', 'GET', 'DELETE'],
  cud: ['POST', 'PATCH', 'DELETE'],
  rud: ['GET', 'PATCH', 'DELETE'],
  cr: ['POST', 'GET'],
  cu: ['POST', 'PATCH'],
  cd: ['POST', 'DELETE'],
  ru: ['GET', 'PATCH'],
  rd: ['GET', 'DELETE'],
  ud: ['PATCH', 'DELETE'],
};

export const httpAliasResolver = createAliasResolver(
  actions as CrudAction & Record<string, string[]>,
);

/**
 * Security rights for a specific role
 */
export interface CrudSecurityRights<T = any> {
  maxBatchSize?: number;

  fields?: string[];

  defineCRUDAbility?(
    can: CanCannot<T, keyof CrudAction>,
    cannot: CanCannot<T, keyof CrudAction>,
    ctx: CrudContext,
  ): Promise<any>;

  defineOPTAbility?(
    can: CanCannot<T>,
    cannot: CanCannot<T>,
    ctx: CrudContext,
  ): Promise<any>;
}
