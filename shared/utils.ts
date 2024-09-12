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

export function getParentRoles(
  roleName: string,
  roles: { name: string; inherits: string[] }[],
): string[] {
  const parentRoles: string[] = [];
  const roleMap = new Map(roles.map((role) => [role.name, role]));

  while (roleName) {
    const role = roleMap.get(roleName);
    if (role && role.inherits && role.inherits.length > 0) {
      roleName = role.inherits[0];
      parentRoles.push(roleName);
    } else {
      break;
    }
  }

  return parentRoles;
}

export function doesInheritRole(
  user: { role: string },
  role,
  roles: { name: string; inherits: string[] }[],
): boolean {
  const currentRole = user.role;
  if (currentRole == role) {
    return true;
  }
  const parents = getParentRoles(currentRole, roles);
  return parents.includes(role);
}
