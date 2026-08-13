import { getPool, closePool } from '../connection';
import dotenv from 'dotenv';

dotenv.config();

const migrationSQL = `
-- Create Categories Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='categories' AND xtype='U')
BEGIN
    CREATE TABLE categories (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        name NVARCHAR(100) NOT NULL,
        code NVARCHAR(10) NOT NULL,
        description NVARCHAR(500) NULL,
        parent_id UNIQUEIDENTIFIER NULL,
        status NVARCHAR(10) NOT NULL DEFAULT 'active',
        created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

        CONSTRAINT CK_categories_status CHECK (status IN ('active', 'inactive')),
        CONSTRAINT CK_categories_code CHECK (code LIKE '%[A-Z]%' AND LEN(code) >= 2 AND LEN(code) <= 10),
        CONSTRAINT UQ_categories_code UNIQUE (code),
        CONSTRAINT FK_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id)
    );

    CREATE INDEX IX_categories_parent_id ON categories(parent_id);
    CREATE INDEX IX_categories_status ON categories(status);
    CREATE INDEX IX_categories_code ON categories(code);

    PRINT 'Categories table created successfully';
END
ELSE
    PRINT 'Categories table already exists';

-- Add category_id column to products table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('products') AND name = 'category_id')
BEGIN
    ALTER TABLE products ADD category_id UNIQUEIDENTIFIER NULL;

    ALTER TABLE products ADD CONSTRAINT FK_products_category
        FOREIGN KEY (category_id) REFERENCES categories(id);

    CREATE INDEX IX_products_category_id ON products(category_id);

    PRINT 'Added category_id column to products table';
END
ELSE
    PRINT 'category_id column already exists in products table';
`;

async function migrate() {
  try {
    console.log('Running category migration...');
    const pool = await getPool();
    await pool.request().query(migrationSQL);
    console.log('Category migration completed successfully!');
  } catch (error) {
    console.error('Category migration failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

migrate();
