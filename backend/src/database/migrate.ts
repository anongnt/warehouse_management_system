import { getPool, closePool } from './connection';
import dotenv from 'dotenv';

dotenv.config();

const migrationSQL = `
-- Create Users Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
BEGIN
    CREATE TABLE users (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        email NVARCHAR(254) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        first_name NVARCHAR(100) NOT NULL,
        last_name NVARCHAR(100) NOT NULL,
        role NVARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        status NVARCHAR(15) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'locked')),
        failed_login_attempts INT NOT NULL DEFAULT 0,
        locked_until DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );

    CREATE INDEX idx_users_email ON users(email);
    CREATE INDEX idx_users_status ON users(status);
    CREATE INDEX idx_users_name ON users(first_name, last_name);

    PRINT 'Users table created successfully';
END
ELSE
    PRINT 'Users table already exists';

-- Create Sessions Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sessions' AND xtype='U')
BEGIN
    CREATE TABLE sessions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash NVARCHAR(255) NOT NULL,
        expires_at DATETIME2 NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );

    CREATE INDEX idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
    CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

    PRINT 'Sessions table created successfully';
END
ELSE
    PRINT 'Sessions table already exists';

-- Create Products Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='products' AND xtype='U')
BEGIN
    CREATE TABLE products (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        name NVARCHAR(200) NOT NULL,
        sku NVARCHAR(50) NOT NULL UNIQUE,
        category NVARCHAR(100) NOT NULL,
        quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0 AND quantity <= 999999),
        unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0 AND unit_price <= 999999999.99),
        description NVARCHAR(1000) NULL,
        status NVARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );

    CREATE INDEX idx_products_sku ON products(sku);
    CREATE INDEX idx_products_category ON products(category);
    CREATE INDEX idx_products_status ON products(status);
    CREATE INDEX idx_products_name ON products(name);
    CREATE INDEX idx_products_created_at ON products(created_at DESC);

    PRINT 'Products table created successfully';
END
ELSE
    PRINT 'Products table already exists';
`;

async function migrate() {
  try {
    console.log('Running database migration...');
    const pool = await getPool();
    await pool.request().query(migrationSQL);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

migrate();
