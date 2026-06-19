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

function base64UrlEncode(input: string) {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

function base64UrlDecode(input: string) {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeSession(session: Session) {
  return base64UrlEncode(JSON.stringify(session));
}

export function decodeSession(value: string | undefined | null): Session | null {
  if (!value) {
    return null;
  }

  try {
    const raw = JSON.parse(base64UrlDecode(value));
    return sessionSchema.parse(raw);
  } catch {
    return null;
  }
}

export function createDemoSession(branchId: string): Session {
  return sessionSchema.parse({
    userId: '11111111-1111-1111-1111-111111111111',
    displayName: 'IMS Admin',
    roles: ['Admin'],
    permissions: ['organization.manage', 'identity.read', 'identity.write'],
    activeBranchId: branchId,
  });
}

export function resolveActiveBranchId(session: Session): BranchId | null {
  return (session.activeBranchId ?? null) as BranchId | null;
}

export function resolveUserId(session: Session): Uuid {
  return session.userId as Uuid;
}
