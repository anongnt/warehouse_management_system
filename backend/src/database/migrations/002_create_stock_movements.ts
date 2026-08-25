import { getPool, closePool } from '../connection';
import dotenv from 'dotenv';

dotenv.config();

const migrationSQL = `
-- Create Stock Documents Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='stock_documents' AND xtype='U')
BEGIN
    CREATE TABLE stock_documents (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        document_number NVARCHAR(20) NOT NULL,
        document_type NVARCHAR(10) NOT NULL,
        document_date DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        note NVARCHAR(1000) NULL,
        status NVARCHAR(10) NOT NULL DEFAULT 'posted',
        created_by UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        cancelled_by UNIQUEIDENTIFIER NULL,
        cancelled_at DATETIME2 NULL,
        cancel_reason NVARCHAR(500) NULL,

        CONSTRAINT UQ_stock_documents_number UNIQUE (document_number),
        CONSTRAINT CK_stock_documents_type CHECK (document_type IN ('receipt', 'issue', 'adjustment')),
        CONSTRAINT CK_stock_documents_status CHECK (status IN ('posted', 'cancelled')),
        CONSTRAINT CK_stock_documents_cancel_fields CHECK (
            (status = 'posted'    AND cancelled_by IS NULL     AND cancelled_at IS NULL) OR
            (status = 'cancelled' AND cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL)
        ),
        CONSTRAINT FK_stock_documents_created_by FOREIGN KEY (created_by) REFERENCES users(id),
        CONSTRAINT FK_stock_documents_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id)
    );

    CREATE INDEX IX_stock_documents_type_date ON stock_documents(document_type, document_date DESC);
    CREATE INDEX IX_stock_documents_status ON stock_documents(status);
    CREATE INDEX IX_stock_documents_created_by ON stock_documents(created_by);

    PRINT 'Stock documents table created successfully';
END
ELSE
    PRINT 'Stock documents table already exists';

-- Create Stock Movements Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='stock_movements' AND xtype='U')
BEGIN
    CREATE TABLE stock_movements (
        id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        seq BIGINT IDENTITY(1,1) NOT NULL,
        document_id UNIQUEIDENTIFIER NOT NULL,
        movement_type NVARCHAR(10) NOT NULL,
        product_id UNIQUEIDENTIFIER NOT NULL,
        quantity INT NOT NULL,
        balance_before INT NOT NULL,
        balance_after INT NOT NULL,
        unit_cost DECIMAL(12, 2) NULL,
        reason NVARCHAR(500) NULL,
        reversal_of_movement_id UNIQUEIDENTIFIER NULL,
        created_by UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

        CONSTRAINT PK_stock_movements PRIMARY KEY (id),
        CONSTRAINT CK_stock_movements_type CHECK (movement_type IN ('receipt', 'issue', 'adjustment', 'reversal')),
        CONSTRAINT CK_stock_movements_quantity CHECK (quantity >= -999999 AND quantity <= 999999),
        CONSTRAINT CK_stock_movements_balance_before CHECK (balance_before >= 0 AND balance_before <= 999999),
        CONSTRAINT CK_stock_movements_balance_after CHECK (balance_after >= 0 AND balance_after <= 999999),
        CONSTRAINT CK_stock_movements_balance_math CHECK (balance_after = balance_before + quantity),
        CONSTRAINT CK_stock_movements_sign CHECK (
            (movement_type = 'receipt' AND quantity > 0) OR
            (movement_type = 'issue'   AND quantity < 0) OR
            (movement_type IN ('adjustment', 'reversal'))
        ),
        CONSTRAINT CK_stock_movements_unit_cost CHECK (unit_cost IS NULL OR (unit_cost >= 0 AND unit_cost <= 999999999.99)),
        CONSTRAINT FK_stock_movements_document FOREIGN KEY (document_id) REFERENCES stock_documents(id),
        CONSTRAINT FK_stock_movements_product FOREIGN KEY (product_id) REFERENCES products(id),
        CONSTRAINT FK_stock_movements_created_by FOREIGN KEY (created_by) REFERENCES users(id),
        CONSTRAINT FK_stock_movements_reversal FOREIGN KEY (reversal_of_movement_id) REFERENCES stock_movements(id)
    );

    CREATE UNIQUE INDEX UX_stock_movements_seq ON stock_movements(seq);
    CREATE INDEX IX_stock_movements_product_seq ON stock_movements(product_id, seq);
    CREATE INDEX IX_stock_movements_document ON stock_movements(document_id);
    CREATE INDEX IX_stock_movements_type ON stock_movements(movement_type);
    CREATE INDEX IX_stock_movements_created_at ON stock_movements(created_at DESC);

    PRINT 'Stock movements table created successfully';
END
ELSE
    PRINT 'Stock movements table already exists';
`;

async function migrate() {
  try {
    console.log('Running stock movements migration...');
    const pool = await getPool();
    await pool.request().query(migrationSQL);
    console.log('Stock movements migration completed successfully!');
  } catch (error) {
    console.error('Stock movements migration failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

migrate();
