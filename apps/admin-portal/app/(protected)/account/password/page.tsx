import { Breadcrumbs, PageHeader, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ims/shared-ui';
import { ShieldCheck } from 'lucide-react';
import { ChangePasswordForm } from './change-password-form';

export const metadata = { title: 'Change Password | IMS Admin' };
export const dynamic = 'force-dynamic';

export default function ChangePasswordPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Change Password"
        description="Update your login password from inside the portal."
        backUrl="/dashboard"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Account' },
              { label: 'Change Password' },
            ]}
          />
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <Card className="border-[color:var(--ims-brass-soft)] bg-[linear-gradient(180deg,rgba(255,250,244,0.96),rgba(255,255,255,0.98))] xl:sticky xl:top-24">
          <CardHeader>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--ims-accent-soft)] text-[color:var(--ims-brass)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle>Security is a habit</CardTitle>
            <CardDescription>
              Changing your password from the logged-in session is the fastest way to recover after a shared device, rotation cycle, or suspicious sign-in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[color:var(--ims-muted)]">
            <p>Use the current password to prove it is really you.</p>
            <p>Choose a new password that is hard to guess and different from the old one.</p>
            <p>All other sessions for this account will be signed out automatically.</p>
          </CardContent>
        </Card>

        <ChangePasswordForm />
      </div>
    </div>
  );
}
