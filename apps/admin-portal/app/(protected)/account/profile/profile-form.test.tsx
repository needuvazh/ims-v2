import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProfileForm } from './profile-form';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe('ProfileForm', () => {
  it('keeps the email field read-only while allowing editable profile fields', () => {
    const html = renderToStaticMarkup(
      <ProfileForm
        user={{
          id: 'test-user-id',
          fullName: 'Fatima Al-Balushi',
          email: 'fatima@example.com',
          phone: '+96899112233',
          userType: 'Student',
          status: 'Active',
          photoUrl: null,
        }}
        activeSessions={[]}
        loginHistory={[]}
        currentSessionJti="test-jti"
      />,
    );

    expect(html).toContain('name="email"');
    expect(html).toContain('disabled');
    expect(html).toContain('name="fullName"');
    expect(html).toContain('name="phone"');
  });
});
