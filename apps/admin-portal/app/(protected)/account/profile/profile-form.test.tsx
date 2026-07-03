import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProfileForm } from './profile-form';

describe('ProfileForm', () => {
  it('keeps the email field read-only while allowing editable profile fields', () => {
    const html = renderToStaticMarkup(
      <ProfileForm
        user={{
          fullName: 'Fatima Al-Balushi',
          email: 'fatima@example.com',
          phone: '+96899112233',
          userType: 'Student',
          status: 'Active',
        }}
      />,
    );

    expect(html).toContain('name="email"');
    expect(html).toContain('disabled');
    expect(html).toContain('name="fullName"');
    expect(html).toContain('name="phone"');
  });
});
