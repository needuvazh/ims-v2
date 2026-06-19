import { z } from 'zod';
import type { BranchId, Uuid } from '@ims/shared-kernel';

export const sessionCookieName = 'ims_session';

export const sessionSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string().min(1),
  roles: z.array(z.string().min(1)).default([]),
  permissions: z.array(z.string().min(1)).default([]),
  activeBranchId: z.string().uuid().nullable().optional(),
});

export type Session = z.infer<typeof sessionSchema>;

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

function bufferToBase64Url(buffer: Uint8Array): string {
  let binary = '';
  for (const byte of buffer) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
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
  return bufferToBase64Url(new Uint8Array(sig));
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
 * Returns null if the value is missing, malformed, or tampered with.
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
    return sessionSchema.parse(raw);
  } catch {
    return null;
  }
}

export function resolveActiveBranchId(session: Session): BranchId | null {
  return (session.activeBranchId ?? null) as BranchId | null;
}

export function resolveUserId(session: Session): Uuid {
  return session.userId as Uuid;
}

/** @deprecated Use the real authService.signIn() instead. Test helper only. */
export function createDemoSession(userId: string): Session {
  return {
    userId,
    displayName: 'Demo User',
    roles: ['SUPER_ADMIN'],
    permissions: ['dashboard.view', 'organization.manage', 'identity.read', 'identity.write'],
    activeBranchId: null,
  };
}
