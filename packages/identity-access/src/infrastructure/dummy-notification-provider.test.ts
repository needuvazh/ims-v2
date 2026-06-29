import { afterEach, describe, expect, it, vi } from 'vitest';
import { DummyNotificationProvider } from './dummy-notification-provider';

describe('DummyNotificationProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redacts activation and reset links from logs', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const provider = new DummyNotificationProvider();

    await provider.sendActivationEmail('user@example.com', {
      firstName: 'User',
      activationLink: 'https://example.com/activate?token=secret-token',
      expiresAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await provider.sendPasswordResetEmail('user@example.com', {
      firstName: 'User',
      expiresAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const output = logSpy.mock.calls.map((call) => String(call[0])).join('\n');
    expect(output).not.toContain('secret-token');
    expect(output).toContain('[REDACTED]');
  });
});
