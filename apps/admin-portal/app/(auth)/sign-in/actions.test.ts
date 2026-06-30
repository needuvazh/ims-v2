import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signInAction } from './actions';
import { DomainError } from '@ims/shared-kernel';

const loginMock = vi.fn();
const cookiesMock = vi.fn(() => ({
  set: vi.fn(),
}));

vi.mock('../../lib/runtime', () => ({
  authService: {
    login: loginMock,
  },
}));

vi.mock('../../lib/observability', () => ({
  createStructuredLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
  getCurrentRequestContext: () => ({}),
  withServerActionObservability: (fn: any) => fn(),
}));

vi.mock('next/headers', () => ({
  cookies: () => cookiesMock(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@ims/shared-auth', () => ({
  sessionCookieName: 'ims_session',
  encodeSession: vi.fn().mockResolvedValue('encoded-session-token'),
}));

class MockIamError extends Error {
  name = 'IamError';
  constructor(
    public readonly errorCode: string,
    public readonly messageEn: string
  ) {
    super(messageEn);
  }
}

describe('signInAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns valid validation error when input email/password are empty', async () => {
    const formData = new FormData();
    formData.append('email', 'omrpravin1@gmail.com');
    const result = await signInAction({}, formData);
    expect(result.error).toBe('Please enter a valid email and password.');
    expect(result.values?.email).toBe('omrpravin1@gmail.com');
    expect(result.values?.rememberMe).toBe(false);
  });

  it('maps IamError to the correct display error message and preserves values', async () => {
    const formData = new FormData();
    formData.append('email', 'omrpravin1@gmail.com');
    formData.append('password', 'wrong-pass');
    formData.append('rememberMe', 'on');

    loginMock.mockRejectedValue(new MockIamError('IAM-AUTH-001', 'Invalid credentials.'));

    const result = await signInAction({}, formData);
    expect(result.error).toBe('Invalid credentials.');
    expect(result.values?.email).toBe('omrpravin1@gmail.com');
    expect(result.values?.password).toBe('wrong-pass');
    expect(result.values?.rememberMe).toBe(true);
  });

  it('maps DomainError to its message and preserves values', async () => {
    const formData = new FormData();
    formData.append('email', 'omrpravin1@gmail.com');
    formData.append('password', 'wrong-pass');

    loginMock.mockRejectedValue(new DomainError('inactive_user_cannot_login', 'User account is inactive.'));

    const result = await signInAction({}, formData);
    expect(result.error).toBe('User account is inactive.');
    expect(result.values?.email).toBe('omrpravin1@gmail.com');
    expect(result.values?.password).toBe('wrong-pass');
    expect(result.values?.rememberMe).toBe(false);
  });

  it('falls back to generic error message for unexpected errors and preserves values', async () => {
    const formData = new FormData();
    formData.append('email', 'omrpravin1@gmail.com');
    formData.append('password', 'wrong-pass');

    loginMock.mockRejectedValue(new Error('Internal database connection failed.'));

    const result = await signInAction({}, formData);
    expect(result.error).toBe('Something went wrong. Please try again.');
    expect(result.values?.email).toBe('omrpravin1@gmail.com');
    expect(result.values?.password).toBe('wrong-pass');
    expect(result.values?.rememberMe).toBe(false);
  });

  it('maps IAM-AUTH-008 (concurrent session limit) error to its messageEn', async () => {
    const formData = new FormData();
    formData.append('email', 'omrpravin1@gmail.com');
    formData.append('password', 'valid-pass');
    formData.append('rememberMe', 'on');

    loginMock.mockRejectedValue(new MockIamError('IAM-AUTH-008', 'Maximum concurrent sessions reached.'));

    const result = await signInAction({}, formData);
    expect(result.error).toBe('Maximum concurrent sessions reached.');
    expect(result.values?.email).toBe('omrpravin1@gmail.com');
    expect(result.values?.password).toBe('valid-pass');
    expect(result.values?.rememberMe).toBe(true);
  });
});
