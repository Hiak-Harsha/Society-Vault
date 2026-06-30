import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  orgId: string;
  name: string;
  ipWhitelist?: string;
}

interface TokenPayload extends JWTPayload, SessionPayload {}

// ─── Constants ───────────────────────────────────────────────────────────────

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';
const COOKIE_NAME = 'session-token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

// ─── Password Utilities ─────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── JWT Utilities ──────────────────────────────────────────────────────────

export async function createToken(payload: SessionPayload): Promise<string> {
  const secret = getJwtSecret();

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secret);
}

export async function verifyToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);

    const tokenPayload = payload as TokenPayload;

    if (
      !tokenPayload.userId ||
      !tokenPayload.email ||
      !tokenPayload.role ||
      !tokenPayload.orgId ||
      !tokenPayload.name
    ) {
      return null;
    }

    return {
      userId: tokenPayload.userId,
      email: tokenPayload.email,
      role: tokenPayload.role,
      orgId: tokenPayload.orgId,
      name: tokenPayload.name,
      ipWhitelist: tokenPayload.ipWhitelist,
    };
  } catch {
    return null;
  }
}

// ─── Session / Cookie Utilities ─────────────────────────────────────────────

export async function getSession(
  cookies: { get: (name: string) => { value: string } | undefined }
): Promise<SessionPayload | null> {
  const cookie = cookies.get(COOKIE_NAME);
  if (!cookie?.value) {
    return null;
  }
  return verifyToken(cookie.value);
}

export function setSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
