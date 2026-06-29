import { z } from 'zod';
import type { Uuid } from '@ims/shared-kernel';

export const sessionCookieName = 'ims_session';

export const sessionSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string().min(1),
  roles: z.array(z.string().min(1)).default([]),
  permissions: z.array(z.string().min(1)).default([]),
  dataScopes: z.array(z.object({
    scopeType: z.string(),
    branchId: z.string().uuid().nullable(),
    departmentId: z.string().uuid().nullable(),
    assignedOnly: z.boolean(),
  })).default([]),
  activeBranchId: z.string().uuid().nullable(),
  accessTokenJti: z.string(),
  hashedRefreshToken: z.string(),
  lastActivityAt: z.number(),
  status: z.enum(['Active', 'Revoked', 'Expired']),
  expiresAt: z.number(),
});

export type Session = Omit<z.infer<typeof sessionSchema>, 'userId' | 'activeBranchId' | 'dataScopes'> & {
  userId: Uuid;
  activeBranchId: Uuid | null;
  dataScopes: Array<{
    scopeType: string;
    branchId: Uuid | null;
    departmentId: Uuid | null;
    assignedOnly: boolean;
  }>;
};

// ─── Low-level base64url helpers ─────────────────────────────────────────────

function base64UrlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// ─── HMAC-SHA256 (Web Crypto API, Edge + Node compatible) ────────────────────

async function hmacSign(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const buffer = new Uint8Array(sig);
  let binary = '';
  for (const byte of buffer) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

async function hmacVerify(message: string, signature: string, secret: string): Promise<boolean> {
  const expected = await hmacSign(message, secret);
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

// ─── Public API ───────────────────────────────────────────────────────────────

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET environment variable is required.');
  return secret;
}

/**
 * Encode + HMAC-sign a session.
 * Format: base64url(json).base64url(hmac)
 */
export async function encodeSession(session: Session): Promise<string> {
  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = await hmacSign(payload, getSessionSecret());
  return `${payload}.${signature}`;
}

/**
 * Verify HMAC signature and decode a session cookie value.
 * Returns null if the value is missing, malformed, expired, or tampered with.
 */
export async function decodeSession(value: string | undefined | null): Promise<Session | null> {
  if (!value) return null;
  try {
    const dotIdx = value.lastIndexOf('.');
    if (dotIdx === -1) return null;
    const payload = value.slice(0, dotIdx);
    const signature = value.slice(dotIdx + 1);
    if (!(await hmacVerify(payload, signature, getSessionSecret()))) return null;
    const raw = JSON.parse(base64UrlDecode(payload));
    const session = sessionSchema.parse(raw) as Session;
    if (Date.now() > session.expiresAt) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function resolveActiveBranchId(session: Session): Uuid | null {
  return session.activeBranchId ?? null;
}

export function resolveUserId(session: Session): Uuid {
  return session.userId as Uuid;
}

/** @deprecated Use the real authService.signIn() instead. Test helper only. */
export function createDemoSession(userId: string): Session {
  return {
    userId: userId as Uuid,
    displayName: 'IMS Admin',
    roles: ['Admin'],
    permissions: [
      'dashboard.view',
      'dashboard.ceo',
      'organization.manage',
      'identity.read',
      'identity.write',
      'iam.user.read',
      'iam.user.create',
      'iam.role.read',
      'iam.security-policy.read',
    ],
    dataScopes: [{ scopeType: 'All', branchId: null, departmentId: null, assignedOnly: false }],
    activeBranchId: null,
    accessTokenJti: 'demo-jti',
    hashedRefreshToken: 'demo-hash',
    lastActivityAt: Date.now(),
    status: 'Active',
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
}
