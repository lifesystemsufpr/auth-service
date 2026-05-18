import { AppConfig } from './config.interface';

const DEFAULT_JWT_EXP = 86400;
const DEFAULT_REFRESH_EXP = 604800;

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

function getCorsOrigins(value: string | undefined): boolean | string | string[] {
  if (!value || value === 'false') return false;
  if (value === 'true') return true;
  if (value === '*') return '*';
  return value.split(',').map((o) => o.trim());
}

export default (): AppConfig => ({
  nest: {
    port: process.env.NEST_PORT ? +process.env.NEST_PORT : 3001,
    environment: process.env.NODE_ENV || 'development',
  },
  cors: {
    enabled: parseBoolean(process.env.CORS_ENABLED, true),
    corsOrigins: getCorsOrigins(process.env.CORS_ORIGINS),
  },
  swagger: {
    title: process.env.SWAGGER_TITLE || 'auth-service',
    description: process.env.SWAGGER_DESCRIPTION || 'Auth Service API',
    version: process.env.SWAGGER_VERSION || '1.0.0',
    path: process.env.SWAGGER_PATH || 'api-docs',
    enabled: parseBoolean(process.env.SWAGGER_ENABLED, true),
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'defaultSecret',
    jwtExpirationTime: process.env.JWT_EXPIRES_IN ? +process.env.JWT_EXPIRES_IN : DEFAULT_JWT_EXP,
    jwtRefreshExpirationTime: process.env.JWT_REFRESH_EXPIRES_IN
      ? +process.env.JWT_REFRESH_EXPIRES_IN
      : DEFAULT_REFRESH_EXP,
  },
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT ? +process.env.SMTP_PORT : 587,
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM_EMAIL || 'noreply@example.com',
    fromName: process.env.SMTP_FROM_NAME || 'Auth Service',
  },
  passwordRecovery: {
    tokenExpiryHours: process.env.PASSWORD_RECOVERY_TOKEN_EXPIRY_HOURS
      ? +process.env.PASSWORD_RECOVERY_TOKEN_EXPIRY_HOURS
      : 24,
    frontendBaseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:3000',
  },
});
