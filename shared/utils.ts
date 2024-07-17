export function toKebabCase(str: string) {
  return str.replace(
    /[A-Z]+(?![a-z])|[A-Z]/g,
    (match, p1) => (p1 ? '-' : '') + match.toLowerCase(),
  );
}

export function kebabToCamelCase(str: string) {
  return str.replace(/-./g, (g) => g[1].toUpperCase());
}

export function kebakToPascalCase(str: string) {
  return str.charAt(0).toUpperCase() + kebabToCamelCase(str).slice(1);
}
