import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'warehouse_management',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 30,
    min: 5,
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool | null = null;

// Get or create connection pool
export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      pool = await new sql.ConnectionPool(config).connect();
      console.log('Database connected successfully');
      return pool;
    } catch (error) {
      lastError = error as Error;
      console.error(`Database connection attempt ${attempt} failed:`, lastError.message);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  throw new Error(`Failed to connect to database after ${maxRetries} attempts: ${lastError?.message}`);
}

// Execute a query with parameters
export async function query<T>(
  queryText: string,
  params?: Record<string, { type: sql.ISqlTypeFactory | ((() => sql.ISqlType) | sql.ISqlType); value: unknown }>
): Promise<sql.IResult<T>> {
  const pool = await getPool();
  const request = pool.request();

  if (params) {
    for (const [key, param] of Object.entries(params)) {
      request.input(key, param.type as (() => sql.ISqlType) | sql.ISqlType, param.value);
    }
  }

  return request.query<T>(queryText);
}

// Close the connection pool
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('Database connection closed');
  }
}

export { sql };
