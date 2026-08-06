import bcrypt from 'bcrypt';
import { getPool, closePool, sql } from './connection';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  try {
    console.log('Seeding database...');
    const pool = await getPool();

    // Check if admin already exists
    const existingAdmin = await pool.request()
      .input('email', sql.NVarChar, 'admin@warehouse.com')
      .query('SELECT id FROM users WHERE email = @email');

    if (existingAdmin.recordset.length > 0) {
      console.log('Admin account already exists, skipping seed.');
      return;
    }

    // Create default admin account
    const passwordHash = await bcrypt.hash('Admin@1234', 12);

    await pool.request()
      .input('email', sql.NVarChar, 'admin@warehouse.com')
      .input('password_hash', sql.NVarChar, passwordHash)
      .input('first_name', sql.NVarChar, 'System')
      .input('last_name', sql.NVarChar, 'Admin')
      .input('role', sql.NVarChar, 'admin')
      .query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES (@email, @password_hash, @first_name, @last_name, @role)
      `);

    console.log('Default admin account created:');
    console.log('  Email: admin@warehouse.com');
    console.log('  Password: Admin@1234');
    console.log('  (Please change this password after first login!)');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

seed();
