export class CrudRole {
  /**
   * A unique name identifying the role.
   * @type {string}
   */
  name: string;
  /**
   * Indicate if the role is an admin role.
   * @usageNotes
   * Admin roles start with more trust and are allowed to perform batch operations.
   * @type {boolean}
   */
  isAdminRole? = false;

  /**
   * Indicate if the role can mock inherited roles.
   * @usageNotes
   * Useful for debugging.
   * @type {boolean}
   */
  canMock? = false;

  /**
   * Indicate that the user's JWT tokens shouldn't be automatically extended
   * even when AuthenticationOptions->renewJwt is set.
   * @type {boolean}
   */
  noTokenRefresh? = false;

  /**
   * A list of roles to inherit abilities from.
   * @type {string[]}
   */
  inherits?: string[] = [];

  /**
   * Multiplies how much traffic this role is allowed, base is normal user traffic (userRequestsThreshold).
   * @type {number}
   */
  allowedTrafficMultiplier?: number = 1;
}
