export function toKebabCase(str: string) {
  return str.replace(
    /[A-Z]+(?![a-z])|[A-Z]/g,
    (match, p1) => (p1 ? '-' : '') + match.toLowerCase(),
  );
}

export function kebabToCamelCase(str: string) {
  str = str.replace(/_/g, '-');
  return str.replace(/-./g, (g) => g[1].toUpperCase());
}

export function kebakToPascalCase(str: string) {
  str = str.replace(/_/g, '-');
  return str.charAt(0).toUpperCase() + kebabToCamelCase(str).slice(1);
}

type CrudRole = {
  name: string;
  inherits?: string[];
};

function recursGetParentRoles(
  roleName: string,
  parentRolesMap: Record<string, boolean>,
  roles: Record<string, CrudRole>,
) {
  const role = roles[roleName];
  if (!role) {
    throw new Error(`Role ${roleName} not found`);
  }
  if (!parentRolesMap[role.name]) {
    parentRolesMap[role.name] = true;
    if (role.inherits?.length) {
      for (const parent of role.inherits) {
        recursGetParentRoles(parent, parentRolesMap, roles);
      }
    }
  }
}

export function getParentRoles(
  roleName: string,
  roles: Record<string, CrudRole>,
): string[] {
  const parentRolesMap = {};

  recursGetParentRoles(roleName, parentRolesMap, roles);

  //return unique values
  return Object.keys(parentRolesMap);
}

export function doesInheritRole(
  user: { role: string },
  role,
  roles: Record<string, CrudRole>,
): boolean {
  const currentRole = user.role;
  const parents = getParentRoles(currentRole, roles);
  return parents.includes(role);
}

export function getEntityId<T = string>(entity: any, idField = 'id'): T {
  if (!entity) {
    return entity;
  }
  if (typeof entity === 'string' || typeof entity === 'number') {
    return entity as T;
  }
  const id = entity?.[idField];
  if (typeof id === 'string' || typeof id === 'number') {
    return id as T;
  }
  if (!id && entity?.toString) {
    return entity.toString() as T;
  }
  return (id?.toString?.() || id) as T;
}
