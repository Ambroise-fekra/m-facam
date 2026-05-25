export interface DbBaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  ssl: false | { rejectUnauthorized: boolean };
}

/** Managed PostgreSQL (Neon, Railway, RDS…) require SSL. Toggle with DB_SSL=true. */
export const dbSsl = (): false | { rejectUnauthorized: boolean } =>
  process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

export const baseDbConfig = (): DbBaseConfig => ({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'facam',
  password: process.env.DB_PASSWORD ?? 'facam_dev_pwd',
  ssl: dbSsl(),
});

export const masterDbName = (): string => process.env.DB_MASTER_NAME ?? 'facam_master';
export const templateDbName = (): string => process.env.DB_TEMPLATE_NAME ?? 'facam_template';

/**
 * Builds the per-family database name from the family identifier.
 * Example: identifier "FAM-DUPONT-2024" → "facam_FAM_DUPONT_2024".
 */
export const tenantDbName = (familyIdentifier: string): string => {
  const safe = familyIdentifier.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase();
  return `facam_${safe}`;
};
