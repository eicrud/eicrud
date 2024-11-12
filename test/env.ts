export const env = process.env.NODE_ENV;
export const jwtSecret = process.env.JWT_SECRET;
export const postgresUsername = process.env.POSTGRES_USERNAME || 'postgres';
export const postgresPassword = process.env.POSTGRES_PASSWORD || 'admin';
export const timeout = Number(process.env.TEST_TIMEOUT || 8000);
