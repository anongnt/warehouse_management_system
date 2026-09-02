// Feature: login-crud-system
// Property-based tests for AuthService: registration, login, logout, change password.
// Covers Properties 1-12 and 23-27 from the design document.
//
// These properties exercise the real AuthService against the real SQL Server
// instance, so every run costs at least one bcrypt operation (cost factor 12,
// ~300ms). `numRuns` is therefore tuned per property: pure input-validation
// properties that reject before hashing use the full 100 runs, while properties
// that must hash/compare passwords use a smaller sample to keep the suite
// runnable. All test data uses the `ptest-auth-` email prefix and is removed in
// afterAll / afterEach.
import dotenv from 'dotenv';

dotenv.config();

import * as fc from 'fast-check';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthService } from '../services/auth.service';
import { getPool, closePool, sql } from '../database';
import {
  ValidationError,
  ConflictError,
  UnauthorizedError,
  AccountLockedError,
} from '../utils/errors';
import { UserModel, RegisterDto, TokenPayload } from '../types';

const authService = new AuthService();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const MAX_FAILED_ATTEMPTS = parseInt(process.env.MAX_FAILED_ATTEMPTS || '5');
const LOCK_DURATION_MINUTES = parseInt(process.env.LOCK_DURATION_MINUTES || '15');

const EMAIL_PREFIX = 'ptest-auth-';
const GENERIC_LOGIN_ERROR = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';

const runId = Date.now().toString(36);
let sequence = 0;

function uniqueEmail(fragment = 'u'): string {
  sequence += 1;
  return `${EMAIL_PREFIX}${fragment}-${runId}-${sequence}@example.com`;
}

// --- Generators -------------------------------------------------------------

// Local part of an email: lowercase alphanumerics only, so generated addresses
// are always syntactically valid before the unique suffix is appended.
const emailFragmentArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
  { minLength: 1, maxLength: 12 }
);

// Valid password: 8-128 chars per Requirement 1.1. Capped at 64 here because
// bcrypt silently truncates input beyond 72 bytes, which would make "two
// distinct passwords" assertions ambiguous.
const validPasswordArb = fc.string({ minLength: 8, maxLength: 64 });

const invalidPasswordArb = fc.oneof(
  fc.string({ minLength: 0, maxLength: 7 }),
  fc.string({ minLength: 129, maxLength: 160 })
);

// Valid name: 1-100 chars of Thai/Latin letters and spaces, non-blank once trimmed.
const validNameArb = fc
  .stringOf(
    fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
      'ก', 'ข', 'ค', 'ง', 'จ', 'ช', 'ด', 'ต', 'ท', 'น', 'ม', 'ร', 'ส', 'ว', ' '
    ),
    { minLength: 1, maxLength: 40 }
  )
  .filter((s) => s.trim().length >= 1);

const invalidNameArb = fc.oneof(
  fc.constantFrom('', ' ', '   ', '\t', '\n  '),
  fc.integer({ min: 101, max: 140 }).map((n) => 'a'.repeat(n)),
  fc.integer({ min: 101, max: 140 }).map((n) => 'ก'.repeat(n))
);

// Addresses that must fail the service's format check (Requirement 1.5).
const invalidEmailArb = fc.oneof(
  fc.constantFrom(
    '',
    'plainaddress',
    '@example.com',
    'user@',
    'user@nodot',
    'user name@example.com',
    'user@@example.com',
    'user@.com'
  ),
  emailFragmentArb.map((f) => `${f}.example.com`), // no @ at all
  emailFragmentArb.map((f) => `${f}@example`), // domain without a dot
  emailFragmentArb.map((f) => `@${f}.com`) // missing local part
);

// --- DB helpers -------------------------------------------------------------

async function findUserRow(email: string): Promise<UserModel | undefined> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('email', sql.NVarChar, email.toLowerCase().trim())
    .query<UserModel>('SELECT * FROM users WHERE email = @email');
  return result.recordset[0];
}

async function findUserRowById(id: string): Promise<UserModel | undefined> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query<UserModel>('SELECT * FROM users WHERE id = @id');
  return result.recordset[0];
}

async function countUsersByEmail(email: string): Promise<number> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('email', sql.NVarChar, email.toLowerCase().trim())
    .query<{ total: number }>('SELECT COUNT(*) AS total FROM users WHERE email = @email');
  return result.recordset[0].total;
}

async function listSessionIds(userId: string): Promise<string[]> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('user_id', sql.UniqueIdentifier, userId)
    .query<{ id: string }>('SELECT id FROM sessions WHERE user_id = @user_id');
  return result.recordset.map((row) => row.id.toLowerCase());
}

async function findSessionByToken(
  token: string
): Promise<{ id: string; user_id: string; expires_at: Date } | undefined> {
  const pool = await getPool();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const result = await pool
    .request()
    .input('token_hash', sql.NVarChar, tokenHash)
    .query<{ id: string; user_id: string; expires_at: Date }>(
      'SELECT id, user_id, expires_at FROM sessions WHERE token_hash = @token_hash'
    );
  return result.recordset[0];
}

// Puts an account straight into the locked state so Requirement 2.5 can be
// verified without paying for MAX_FAILED_ATTEMPTS bcrypt comparisons.
async function forceLock(userId: string, minutesFromNow: number): Promise<Date> {
  const lockedUntil = new Date(Date.now() + minutesFromNow * 60 * 1000);
  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, userId)
    .input('locked_until', sql.DateTime2, lockedUntil)
    .input('attempts', sql.Int, MAX_FAILED_ATTEMPTS)
    .query(
      `UPDATE users
       SET status = 'locked', locked_until = @locked_until, failed_login_attempts = @attempts
       WHERE id = @id`
    );
  return lockedUntil;
}

async function cleanupTestUsers(): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input('prefix', sql.NVarChar, `${EMAIL_PREFIX}%`)
    .query(
      'DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE @prefix)'
    );
  await pool
    .request()
    .input('prefix', sql.NVarChar, `${EMAIL_PREFIX}%`)
    .query('DELETE FROM users WHERE email LIKE @prefix');
}

interface TestAccount {
  email: string;
  password: string;
  id: string;
}

async function registerAccount(overrides: Partial<RegisterDto> = {}): Promise<TestAccount> {
  const data: RegisterDto = {
    email: overrides.email ?? uniqueEmail(),
    password: overrides.password ?? 'ValidPass123',
    firstName: overrides.firstName ?? 'Test',
    lastName: overrides.lastName ?? 'User',
  };
  const user = await authService.register(data);
  return { email: data.email, password: data.password, id: user.id };
}

async function expectRejection<T extends Error>(
  action: () => Promise<unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errorType: new (...args: any[]) => T
): Promise<T> {
  try {
    await action();
  } catch (error) {
    expect(error).toBeInstanceOf(errorType);
    return error as T;
  }
  throw new Error(`Expected ${errorType.name} to be thrown, but the call resolved`);
}

const LONG_TIMEOUT = 300_000;

describe('Feature: login-crud-system - AuthService properties', () => {
  beforeAll(async () => {
    const pool = await getPool();
    // Ensure the users/sessions schema exists (same DDL as src/database/migrate.ts).
    await pool.request().query(`
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
      END
    `);
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sessions' AND xtype='U')
      BEGIN
        CREATE TABLE sessions (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash NVARCHAR(255) NOT NULL,
          expires_at DATETIME2 NOT NULL,
          created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
        );
      END
    `);
    await cleanupTestUsers();
  }, LONG_TIMEOUT);

  afterAll(async () => {
    await cleanupTestUsers();
    await closePool();
  }, LONG_TIMEOUT);

  // ==========================================================================
  // Registration - Requirements 1.1-1.6
  // ==========================================================================
  describe('Registration', () => {
    afterEach(cleanupTestUsers);

    // Property 1: Registration succeeds with valid data
    it(
      'Property 1: any valid registration input creates an active user and echoes back the normalised data',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            emailFragmentArb,
            validPasswordArb,
            validNameArb,
            validNameArb,
            async (fragment, password, firstName, lastName) => {
              // Mixed case on purpose: the service must normalise to lowercase.
              const email = uniqueEmail(fragment).toUpperCase();

              const user = await authService.register({ email, password, firstName, lastName });

              expect(user.id).toBeTruthy();
              expect(user.email).toBe(email.toLowerCase().trim());
              expect(user.firstName).toBe(firstName.trim());
              expect(user.lastName).toBe(lastName.trim());
              expect(user.role).toBe('user');
              expect(user.status).toBe('active');
              expect(user).not.toHaveProperty('password');
              expect(user).not.toHaveProperty('password_hash');

              // The row really landed in the database.
              expect(await countUsersByEmail(email)).toBe(1);
            }
          ),
          { numRuns: 12 }
        );
      },
      LONG_TIMEOUT
    );

    // Property 2: Duplicate email rejection
    it(
      'Property 2: registering an email that already exists is rejected and never creates a second row',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            emailFragmentArb,
            validPasswordArb,
            validNameArb,
            async (fragment, password, name) => {
              const email = uniqueEmail(fragment);
              await authService.register({ email, password, firstName: name, lastName: name });

              const error = await expectRejection(
                () =>
                  authService.register({
                    // Different case, same address: still a duplicate.
                    email: email.toUpperCase(),
                    password: `${password}x`,
                    firstName: 'Other',
                    lastName: 'Person',
                  }),
                ConflictError
              );

              expect(error.message).toBe('อีเมลนี้ถูกใช้งานแล้ว');
              expect(error.statusCode).toBe(409);
              expect(await countUsersByEmail(email)).toBe(1);
            }
          ),
          { numRuns: 8 }
        );
      },
      LONG_TIMEOUT
    );

    // Property 3: Password length validation
    it(
      'Property 3: passwords outside 8-128 characters are rejected without writing to the database',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            emailFragmentArb,
            invalidPasswordArb,
            validNameArb,
            async (fragment, password, name) => {
              const email = uniqueEmail(fragment);

              const error = await expectRejection(
                () =>
                  authService.register({ email, password, firstName: name, lastName: name }),
                ValidationError
              );

              expect(error.statusCode).toBe(400);
              expect(error.details?.some((detail) => 'password' in detail)).toBe(true);
              expect(await countUsersByEmail(email)).toBe(0);
            }
          ),
          { numRuns: 100 }
        );
      },
      LONG_TIMEOUT
    );

    // Property 4: Password hashing invariant
    it(
      'Property 4: the stored password is always a bcrypt hash that verifies against the plaintext',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            emailFragmentArb,
            validPasswordArb,
            validNameArb,
            async (fragment, password, name) => {
              const email = uniqueEmail(fragment);
              await authService.register({ email, password, firstName: name, lastName: name });

              const row = await findUserRow(email);
              expect(row).toBeDefined();
              expect(row!.password_hash).not.toBe(password);
              expect(row!.password_hash).toMatch(/^\$2[aby]\$\d{2}\$/);
              // Cost factor must be 10 or higher (Requirement 1.4).
              expect(parseInt(row!.password_hash.split('$')[2], 10)).toBeGreaterThanOrEqual(10);
              expect(await bcrypt.compare(password, row!.password_hash)).toBe(true);
            }
          ),
          { numRuns: 10 }
        );
      },
      LONG_TIMEOUT
    );

    // Property 5: Email format validation
    it(
      'Property 5: malformed email addresses are rejected without writing to the database',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            invalidEmailArb,
            validPasswordArb,
            validNameArb,
            async (email, password, name) => {
              const error = await expectRejection(
                () =>
                  authService.register({ email, password, firstName: name, lastName: name }),
                ValidationError
              );

              expect(error.details?.some((detail) => 'email' in detail)).toBe(true);
              expect(await countUsersByEmail(email)).toBe(0);
            }
          ),
          { numRuns: 100 }
        );
      },
      LONG_TIMEOUT
    );

    // Property 6: Name length validation
    it(
      'Property 6: blank or over-long first/last names are rejected without writing to the database',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            emailFragmentArb,
            validPasswordArb,
            invalidNameArb,
            validNameArb,
            fc.boolean(),
            async (fragment, password, badName, goodName, badIsFirstName) => {
              const email = uniqueEmail(fragment);
              const firstName = badIsFirstName ? badName : goodName;
              const lastName = badIsFirstName ? goodName : badName;

              const error = await expectRejection(
                () => authService.register({ email, password, firstName, lastName }),
                ValidationError
              );

              const failedField = badIsFirstName ? 'firstName' : 'lastName';
              expect(error.details?.some((detail) => failedField in detail)).toBe(true);
              expect(await countUsersByEmail(email)).toBe(0);
            }
          ),
          { numRuns: 100 }
        );
      },
      LONG_TIMEOUT
    );
  });

  // ==========================================================================
  // Login - Requirements 2.1-2.5
  // ==========================================================================
  describe('Login', () => {
    afterEach(cleanupTestUsers);

    // Property 7: Successful login produces valid token
    it(
      'Property 7: a correct login returns a 24h JWT whose payload and session row match the user',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            emailFragmentArb,
            validPasswordArb,
            validNameArb,
            async (fragment, password, name) => {
              const email = uniqueEmail(fragment);
              const created = await authService.register({
                email,
                password,
                firstName: name,
                lastName: name,
              });

              const result = await authService.login({ email, password });

              expect(result.user.id).toBe(created.id);
              expect(result.token).toBeTruthy();

              const payload = jwt.verify(result.token, JWT_SECRET) as TokenPayload;
              expect(payload.userId.toLowerCase()).toBe(created.id.toLowerCase());
              expect(payload.email).toBe(email.toLowerCase());
              expect(payload.role).toBe('user');
              expect(payload.sessionId).toBeTruthy();
              // 24 hour expiry (Requirement 2.1).
              expect(payload.exp! - payload.iat!).toBe(24 * 60 * 60);

              // The session is persisted as a hash, never as the raw token.
              const session = await findSessionByToken(result.token);
              expect(session).toBeDefined();
              expect(session!.id.toLowerCase()).toBe(payload.sessionId.toLowerCase());
              expect(session!.user_id.toLowerCase()).toBe(created.id.toLowerCase());
              expect(new Date(session!.expires_at).getTime()).toBeGreaterThan(Date.now());
            }
          ),
          { numRuns: 8 }
        );
      },
      LONG_TIMEOUT
    );

    // Property 8: Generic error message on failed login
    it(
      'Property 8: unknown email and wrong password produce the exact same generic error',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            emailFragmentArb,
            validPasswordArb,
            validNameArb,
            async (fragment, password, name) => {
              const email = uniqueEmail(fragment);
              await authService.register({ email, password, firstName: name, lastName: name });

              const wrongPasswordError = await expectRejection(
                () => authService.login({ email, password: `${password}-wrong` }),
                UnauthorizedError
              );
              const unknownEmailError = await expectRejection(
                () => authService.login({ email: uniqueEmail('ghost'), password }),
                UnauthorizedError
              );

              // Requirement 2.2: one message for both cases, so an attacker
              // cannot tell a registered email from an unregistered one.
              expect(wrongPasswordError.message).toBe(GENERIC_LOGIN_ERROR);
              expect(unknownEmailError.message).toBe(wrongPasswordError.message);
              expect(wrongPasswordError.code).toBe(unknownEmailError.code);
              expect(wrongPasswordError.statusCode).toBe(401);
            }
          ),
          { numRuns: 6 }
        );
      },
      LONG_TIMEOUT
    );

    // Property 9: Failed login counter reset on success
    it(
      'Property 9: fewer than the maximum failed attempts followed by a success resets the counter to 0',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            emailFragmentArb,
            validPasswordArb,
            fc.integer({ min: 1, max: MAX_FAILED_ATTEMPTS - 1 }),
            async (fragment, password, failures) => {
              const email = uniqueEmail(fragment);
              const created = await authService.register({
                email,
                password,
                firstName: 'Counter',
                lastName: 'Reset',
              });

              for (let i = 0; i < failures; i += 1) {
                await expectRejection(
                  () => authService.login({ email, password: `${password}-wrong` }),
                  UnauthorizedError
                );
              }

              const beforeSuccess = await findUserRowById(created.id);
              expect(beforeSuccess!.failed_login_attempts).toBe(failures);

              await authService.login({ email, password });

              const afterSuccess = await findUserRowById(created.id);
              expect(afterSuccess!.failed_login_attempts).toBe(0);
              expect(afterSuccess!.locked_until).toBeNull();
              expect(afterSuccess!.status).toBe('active');
            }
          ),
          { numRuns: 4 }
        );
      },
      LONG_TIMEOUT
    );

    // Property 10: Account locking after 5 failed attempts
    it(
      'Property 10: the fifth consecutive wrong password locks the account for 15 minutes',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            emailFragmentArb,
            validPasswordArb,
            async (fragment, password) => {
              const email = uniqueEmail(fragment);
              const created = await authService.register({
                email,
                password,
                firstName: 'Lock',
                lastName: 'Me',
              });

              // Attempts 1..MAX-1 are plain credential failures.
              for (let i = 0; i < MAX_FAILED_ATTEMPTS - 1; i += 1) {
                await expectRejection(
                  () => authService.login({ email, password: `${password}-wrong` }),
                  UnauthorizedError
                );
              }

              const lockedAtLowerBound = Date.now();
              const lockError = await expectRejection(
                () => authService.login({ email, password: `${password}-wrong` }),
                AccountLockedError
              );

              expect(lockError.statusCode).toBe(423);
              expect(lockError.code).toBe('ACCOUNT_LOCKED');

              const expectedUnlock = lockedAtLowerBound + LOCK_DURATION_MINUTES * 60 * 1000;
              expect(lockError.lockedUntil.getTime()).toBeGreaterThanOrEqual(
                expectedUnlock - 5_000
              );
              expect(lockError.lockedUntil.getTime()).toBeLessThanOrEqual(expectedUnlock + 30_000);

              const row = await findUserRowById(created.id);
              expect(row!.status).toBe('locked');
              expect(row!.failed_login_attempts).toBeGreaterThanOrEqual(MAX_FAILED_ATTEMPTS);
              expect(row!.locked_until).not.toBeNull();
            }
          ),
          { numRuns: 3 }
        );
      },
      LONG_TIMEOUT
    );

    // Property 11: Locked account login rejection
    it(
      'Property 11: a locked account is rejected even when the password is correct, and no session is created',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            emailFragmentArb,
            validPasswordArb,
            fc.integer({ min: 1, max: LOCK_DURATION_MINUTES }),
            async (fragment, password, minutesRemaining) => {
              const email = uniqueEmail(fragment);
              const created = await authService.register({
                email,
                password,
                firstName: 'Locked',
                lastName: 'Account',
              });
              const lockedUntil = await forceLock(created.id, minutesRemaining);

              const error = await expectRejection(
                () => authService.login({ email, password }),
                AccountLockedError
              );

              expect(error.statusCode).toBe(423);
              // The remaining lock time is reported back so the UI can show it.
              expect(Math.abs(error.lockedUntil.getTime() - lockedUntil.getTime())).toBeLessThan(
                1_000
              );
              expect(await listSessionIds(created.id)).toHaveLength(0);
            }
          ),
          { numRuns: 6 }
        );
      },
      LONG_TIMEOUT
    );
  });

  // ==========================================================================
  // Logout - Requirement 3.1
  // ==========================================================================
  describe('Logout', () => {
    afterEach(cleanupTestUsers);

    // Property 12: Logout invalidates session token
    it(
      'Property 12: after logout the token no longer validates and its session row is gone',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            emailFragmentArb,
            validPasswordArb,
            async (fragment, password) => {
              const email = uniqueEmail(fragment);
              const created = await authService.register({
                email,
                password,
                firstName: 'Log',
                lastName: 'Out',
              });

              const { token } = await authService.login({ email, password });
              expect(await authService.validateToken(token)).not.toBeNull();

              await authService.logout(token);

              expect(await findSessionByToken(token)).toBeUndefined();
              expect(await authService.validateToken(token)).toBeNull();
              expect(await listSessionIds(created.id)).toHaveLength(0);

              // Logging out twice must not throw (graceful handling).
              await expect(authService.logout(token)).resolves.toBeUndefined();
            }
          ),
          { numRuns: 6 }
        );
      },
      LONG_TIMEOUT
    );
  });

  // ==========================================================================
  // Change password - Requirements 8.1-8.5
  // ==========================================================================
  describe('Change password', () => {
    afterEach(cleanupTestUsers);

    // Property 23: Password change with valid conditions
    it(
      'Property 23: a valid change replaces the hash so only the new password verifies',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            validPasswordArb,
            validPasswordArb,
            async (oldPassword, newPasswordSeed) => {
              // Guarantee the two passwords differ (Requirement 8.5 is a separate property).
              const newPassword = `${newPasswordSeed}-new`;
              fc.pre(oldPassword !== newPassword);

              const account = await registerAccount({ password: oldPassword });
              const { token } = await authService.login({
                email: account.email,
                password: oldPassword,
              });
              const { sessionId } = jwt.verify(token, JWT_SECRET) as TokenPayload;

              await authService.changePassword(account.id, sessionId, {
                oldPassword,
                newPassword,
                confirmPassword: newPassword,
              });

              const row = await findUserRowById(account.id);
              expect(await bcrypt.compare(newPassword, row!.password_hash)).toBe(true);
              expect(await bcrypt.compare(oldPassword, row!.password_hash)).toBe(false);

              // The new password is usable for login, the old one is not.
              await expect(
                authService.login({ email: account.email, password: newPassword })
              ).resolves.toHaveProperty('token');
            }
          ),
          { numRuns: 4 }
        );
      },
      LONG_TIMEOUT
    );

    // Property 24: Password change rejection on wrong old password
    it(
      'Property 24: a wrong current password is rejected and leaves the stored hash untouched',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            validPasswordArb,
            validPasswordArb,
            async (oldPassword, newPassword) => {
              fc.pre(oldPassword !== newPassword);

              const account = await registerAccount({ password: oldPassword });
              const before = await findUserRowById(account.id);

              const error = await expectRejection(
                () =>
                  authService.changePassword(account.id, crypto.randomUUID(), {
                    oldPassword: `${oldPassword}-nope`,
                    newPassword,
                    confirmPassword: newPassword,
                  }),
                ValidationError
              );

              expect(error.message).toBe('รหัสผ่านเดิมไม่ถูกต้อง');
              const after = await findUserRowById(account.id);
              expect(after!.password_hash).toBe(before!.password_hash);
            }
          ),
          { numRuns: 5 }
        );
      },
      LONG_TIMEOUT
    );

    // Property 25: Session cleanup after password change
    it(
      'Property 25: changing the password revokes every session except the one making the request',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            validPasswordArb,
            fc.integer({ min: 2, max: 4 }),
            async (oldPassword, sessionCount) => {
              const newPassword = `${oldPassword}-rotated`;
              const account = await registerAccount({ password: oldPassword });

              const tokens: string[] = [];
              for (let i = 0; i < sessionCount; i += 1) {
                const { token } = await authService.login({
                  email: account.email,
                  password: oldPassword,
                });
                tokens.push(token);
              }
              expect(await listSessionIds(account.id)).toHaveLength(sessionCount);

              const currentToken = tokens[tokens.length - 1];
              const { sessionId } = jwt.verify(currentToken, JWT_SECRET) as TokenPayload;

              await authService.changePassword(account.id, sessionId, {
                oldPassword,
                newPassword,
                confirmPassword: newPassword,
              });

              const remaining = await listSessionIds(account.id);
              expect(remaining).toEqual([sessionId.toLowerCase()]);
              expect(await authService.validateToken(currentToken)).not.toBeNull();
              for (const revoked of tokens.slice(0, -1)) {
                expect(await authService.validateToken(revoked)).toBeNull();
              }
            }
          ),
          { numRuns: 3 }
        );
      },
      LONG_TIMEOUT
    );

    // Property 26: Password confirmation mismatch rejection
    it(
      'Property 26: a confirmation that does not match the new password is always rejected',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            validPasswordArb,
            validPasswordArb,
            async (newPassword, confirmSeed) => {
              const confirmPassword = `${confirmSeed}-mismatch`;
              fc.pre(newPassword !== confirmPassword);

              const error = await expectRejection(
                () =>
                  authService.changePassword(crypto.randomUUID(), crypto.randomUUID(), {
                    oldPassword: 'IrrelevantOld1',
                    newPassword,
                    confirmPassword,
                  }),
                ValidationError
              );

              expect(error.message).toBe('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
              expect(error.statusCode).toBe(400);
            }
          ),
          // Rejected before any hashing or database access, so a full sample is cheap.
          { numRuns: 100 }
        );
      },
      LONG_TIMEOUT
    );

    // Property 27: New password same as old rejection
    it(
      'Property 27: reusing the current password is rejected and leaves the stored hash untouched',
      async () => {
        await fc.assert(
          fc.asyncProperty(validPasswordArb, async (password) => {
            const account = await registerAccount({ password });
            const before = await findUserRowById(account.id);

            const error = await expectRejection(
              () =>
                authService.changePassword(account.id, crypto.randomUUID(), {
                  oldPassword: password,
                  newPassword: password,
                  confirmPassword: password,
                }),
              ValidationError
            );

            expect(error.message).toBe('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม');
            const after = await findUserRowById(account.id);
            expect(after!.password_hash).toBe(before!.password_hash);
          }),
          { numRuns: 5 }
        );
      },
      LONG_TIMEOUT
    );
  });
});
