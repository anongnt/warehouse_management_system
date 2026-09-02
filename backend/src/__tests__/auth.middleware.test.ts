// Feature: login-crud-system
// Property-based tests for the authentication/authorization middleware.
// Covers Properties 21-22 from the design document (Requirements 7.1, 7.2, 7.3, 7.5).
//
// Unlike the other suites in this repo, nothing is mocked here: requests go
// through the real Express app, the real `authenticate`/`requireAdmin`
// middleware and the real sessions table, because the token/session handshake
// is exactly what is under test.
import dotenv from 'dotenv';

dotenv.config();

import * as fc from 'fast-check';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import app from '../app';
import { AuthService } from '../services/auth.service';
import { getPool, closePool, sql } from '../database';
import { TokenPayload } from '../types';

const authService = new AuthService();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const EMAIL_PREFIX = 'ptest-mw-';

const runId = Date.now().toString(36);
let sequence = 0;

function uniqueEmail(): string {
  sequence += 1;
  return `${EMAIL_PREFIX}${runId}-${sequence}@example.com`;
}

// Endpoints used as probes: one needs only authentication, one also needs the
// admin role.
const AUTH_ONLY_ENDPOINT = '/api/auth/change-password';
const ADMIN_ONLY_ENDPOINT = '/api/users';

const PASSWORD = 'ValidPass123';

interface Session {
  email: string;
  userId: string;
  token: string;
  sessionId: string;
}

async function createSession(role: 'admin' | 'user'): Promise<Session> {
  const email = uniqueEmail();
  const created = await authService.register({
    email,
    password: PASSWORD,
    firstName: 'Middleware',
    lastName: role === 'admin' ? 'Admin' : 'User',
  });

  if (role === 'admin') {
    const pool = await getPool();
    await pool
      .request()
      .input('id', sql.UniqueIdentifier, created.id)
      .query("UPDATE users SET role = 'admin' WHERE id = @id");
  }

  const { token } = await authService.login({ email, password: PASSWORD });
  const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
  return { email, userId: created.id, token, sessionId: payload.sessionId };
}

async function deleteSessionRow(token: string): Promise<void> {
  const pool = await getPool();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await pool
    .request()
    .input('token_hash', sql.NVarChar, tokenHash)
    .query('DELETE FROM sessions WHERE token_hash = @token_hash');
}

// A structurally valid, correctly signed JWT that was never stored as a
// session - i.e. a revoked/unknown token.
function signOrphanToken(overrides: Partial<TokenPayload> = {}, expiresIn = '24h'): string {
  const payload: TokenPayload = {
    userId: crypto.randomUUID(),
    email: uniqueEmail(),
    role: 'user',
    sessionId: crypto.randomUUID(),
    ...overrides,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
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

const LONG_TIMEOUT = 300_000;

describe('Feature: login-crud-system - Auth middleware properties', () => {
  let adminSession: Session;
  let userSession: Session;

  beforeAll(async () => {
    await getPool();
    await cleanupTestUsers();
    adminSession = await createSession('admin');
    userSession = await createSession('user');
  }, LONG_TIMEOUT);

  afterAll(async () => {
    await cleanupTestUsers();
    await closePool();
  }, LONG_TIMEOUT);

  // ==========================================================================
  // Property 21: Invalid token rejection (Requirements 7.1, 7.3, 7.5)
  // ==========================================================================
  describe('Property 21: invalid token rejection', () => {
    it(
      'rejects any request without an Authorization header with 401 and a "no token" message',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.constantFrom(AUTH_ONLY_ENDPOINT, ADMIN_ONLY_ENDPOINT),
            async (endpoint) => {
              const res =
                endpoint === ADMIN_ONLY_ENDPOINT
                  ? await request(app).get(endpoint)
                  : await request(app).post(endpoint).send({});

              expect(res.status).toBe(401);
              expect(res.body.success).toBe(false);
              expect(res.body.error.code).toBe('UNAUTHORIZED');
              expect(res.body.error.message).toBe('ไม่พบ Token ในคำขอ');
            }
          ),
          { numRuns: 20 }
        );
      },
      LONG_TIMEOUT
    );

    it(
      'rejects any Authorization header that is not exactly "Bearer <token>" with a format error',
      async () => {
        // Anything that does not split into exactly two space-separated parts
        // with the literal scheme "Bearer" must be refused before the token is
        // ever parsed.
        const malformedHeaderArb = fc.oneof(
          fc.constant('Bearer'),
          fc.constant('bearer sometoken'),
          fc.constant('BEARER sometoken'),
          fc.constant('Basic dXNlcjpwYXNz'),
          fc.constant('Token abc.def.ghi'),
          fc.constant('Bearer a b'),
          fc
            .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz.'.split('')), {
              minLength: 1,
              maxLength: 20,
            })
            .map((raw) => raw), // bare token, no scheme
          fc
            .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
              minLength: 1,
              maxLength: 10,
            })
            .map((scheme) => `${scheme} token`)
            .filter((header) => !header.startsWith('Bearer '))
        );

        await fc.assert(
          fc.asyncProperty(malformedHeaderArb, async (header) => {
            const res = await request(app).get(ADMIN_ONLY_ENDPOINT).set('Authorization', header);

            expect(res.status).toBe(401);
            expect(res.body.error.code).toBe('UNAUTHORIZED');
            expect(res.body.error.message).toBe('Token รูปแบบไม่ถูกต้อง');
          }),
          { numRuns: 40 }
        );
      },
      LONG_TIMEOUT
    );

    it(
      'rejects garbage and wrongly signed tokens with 401',
      async () => {
        const badTokenArb = fc.oneof(
          // Random opaque strings: not a JWT at all.
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
            minLength: 1,
            maxLength: 40,
          }),
          // Well-formed JWT signed with the wrong secret.
          fc
            .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
              minLength: 5,
              maxLength: 15,
            })
            .map((secret) =>
              jwt.sign(
                {
                  userId: crypto.randomUUID(),
                  email: 'forged@example.com',
                  role: 'admin',
                  sessionId: crypto.randomUUID(),
                },
                `not-the-real-secret-${secret}`,
                { expiresIn: '24h' }
              )
            ),
          // Valid token whose signature has been tampered with.
          fc.constant(`${signOrphanToken()}tampered`)
        );

        await fc.assert(
          fc.asyncProperty(badTokenArb, async (token) => {
            const res = await request(app)
              .get(ADMIN_ONLY_ENDPOINT)
              .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.error.code).toBe('UNAUTHORIZED');
          }),
          { numRuns: 30 }
        );
      },
      LONG_TIMEOUT
    );

    it(
      'rejects expired tokens even when a matching session row still exists (Requirement 7.3)',
      async () => {
        await fc.assert(
          fc.asyncProperty(fc.integer({ min: 1, max: 3600 }), async (secondsAgo) => {
            const sessionId = crypto.randomUUID();
            const expiredToken = jwt.sign(
              {
                userId: adminSession.userId,
                email: adminSession.email,
                role: 'admin',
                sessionId,
              },
              JWT_SECRET,
              { expiresIn: `-${secondsAgo}s` } as jwt.SignOptions
            );

            // Deliberately keep a live session row so the rejection can only
            // come from the expiry check.
            const pool = await getPool();
            const tokenHash = crypto.createHash('sha256').update(expiredToken).digest('hex');
            await pool
              .request()
              .input('id', sql.UniqueIdentifier, sessionId)
              .input('user_id', sql.UniqueIdentifier, adminSession.userId)
              .input('token_hash', sql.NVarChar, tokenHash)
              .input('expires_at', sql.DateTime2, new Date(Date.now() + 3600_000))
              .query(
                `INSERT INTO sessions (id, user_id, token_hash, expires_at)
                 VALUES (@id, @user_id, @token_hash, @expires_at)`
              );

            const res = await request(app)
              .get(ADMIN_ONLY_ENDPOINT)
              .set('Authorization', `Bearer ${expiredToken}`);

            expect(res.status).toBe(401);
            expect(res.body.error.code).toBe('UNAUTHORIZED');
          }),
          { numRuns: 8 }
        );
      },
      LONG_TIMEOUT
    );

    it(
      'rejects correctly signed tokens that have no session row (revoked tokens)',
      async () => {
        await fc.assert(
          fc.asyncProperty(fc.constantFrom<'admin' | 'user'>('admin', 'user'), async (role) => {
            const orphan = signOrphanToken({ role });

            const res = await request(app)
              .get(ADMIN_ONLY_ENDPOINT)
              .set('Authorization', `Bearer ${orphan}`);

            expect(res.status).toBe(401);
            expect(res.body.error.code).toBe('UNAUTHORIZED');
          }),
          { numRuns: 10 }
        );
      },
      LONG_TIMEOUT
    );

    it(
      'rejects a token immediately after its session is revoked, and accepted it before',
      async () => {
        const session = await createSession('admin');

        const before = await request(app)
          .get(ADMIN_ONLY_ENDPOINT)
          .set('Authorization', `Bearer ${session.token}`);
        expect(before.status).toBe(200);

        await deleteSessionRow(session.token);

        const after = await request(app)
          .get(ADMIN_ONLY_ENDPOINT)
          .set('Authorization', `Bearer ${session.token}`);
        expect(after.status).toBe(401);
        expect(after.body.error.code).toBe('UNAUTHORIZED');
      },
      LONG_TIMEOUT
    );

    it(
      'accepts a live token and attaches the authenticated identity to the request',
      async () => {
        // The change-password endpoint reads req.user.userId / req.user.sessionId,
        // so a validation error (rather than 401) proves the identity was attached.
        const res = await request(app)
          .post(AUTH_ONLY_ENDPOINT)
          .set('Authorization', `Bearer ${userSession.token}`)
          .send({ oldPassword: PASSWORD, newPassword: 'short', confirmPassword: 'short' });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      },
      LONG_TIMEOUT
    );
  });

  // ==========================================================================
  // Property 22: Role-based access control (Requirement 7.2)
  // ==========================================================================
  describe('Property 22: role-based access control', () => {
    it(
      'refuses every user-management method for a non-admin role with 403 "สิทธิ์ไม่เพียงพอ"',
      async () => {
        const methodArb = fc.constantFrom<'get' | 'getById' | 'put' | 'delete'>(
          'get',
          'getById',
          'put',
          'delete'
        );

        await fc.assert(
          fc.asyncProperty(methodArb, async (method) => {
            const target = adminSession.userId;
            const auth = `Bearer ${userSession.token}`;

            let res;
            switch (method) {
              case 'get':
                res = await request(app).get(ADMIN_ONLY_ENDPOINT).set('Authorization', auth);
                break;
              case 'getById':
                res = await request(app)
                  .get(`${ADMIN_ONLY_ENDPOINT}/${target}`)
                  .set('Authorization', auth);
                break;
              case 'put':
                res = await request(app)
                  .put(`${ADMIN_ONLY_ENDPOINT}/${target}`)
                  .set('Authorization', auth)
                  .send({ firstName: 'Hacked' });
                break;
              case 'delete':
                res = await request(app)
                  .delete(`${ADMIN_ONLY_ENDPOINT}/${target}`)
                  .set('Authorization', auth);
                break;
            }

            expect(res!.status).toBe(403);
            expect(res!.body.success).toBe(false);
            expect(res!.body.error.code).toBe('FORBIDDEN');
            expect(res!.body.error.message).toBe('สิทธิ์ไม่เพียงพอ');
          }),
          { numRuns: 20 }
        );
      },
      LONG_TIMEOUT
    );

    it(
      'lets an admin through to the same endpoints',
      async () => {
        const res = await request(app)
          .get(ADMIN_ONLY_ENDPOINT)
          .set('Authorization', `Bearer ${adminSession.token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.data)).toBe(true);
      },
      LONG_TIMEOUT
    );

    it(
      'still allows a non-admin to reach endpoints that only require authentication',
      async () => {
        const res = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${userSession.token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Restore a live session for the remaining tests in this file.
        const refreshed = await authService.login({
          email: userSession.email,
          password: PASSWORD,
        });
        userSession.token = refreshed.token;
      },
      LONG_TIMEOUT
    );
  });
});
