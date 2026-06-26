import { Breadcrumbs, Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from '@ims/shared-ui';
import { UserCircle2, ShieldCheck } from 'lucide-react';
import { getSession } from '../../../lib/auth-guard';
import { userService } from '../../../lib/runtime';
import { ProfileForm } from './profile-form';

export const metadata = { title: 'My Profile | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await getSession();
  const user = await userService.getUser(session.userId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Profile"
        description="Review and update your personal account details. Email remains fixed."
        backUrl="/dashboard"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Account' },
              { label: 'My Profile' },
            ]}
          />
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <Card className="border-[color:var(--ims-brass-soft)] bg-[linear-gradient(180deg,rgba(255,250,244,0.96),rgba(255,255,255,0.98))] xl:sticky xl:top-24">
          <CardHeader>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--ims-accent-soft)] text-[color:var(--ims-brass)]">
              <UserCircle2 className="h-6 w-6" />
            </div>
            <CardTitle>Account snapshot</CardTitle>
            <CardDescription>These details identify your signed-in account across the portal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[color:var(--ims-muted)]">
            <div className="rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--ims-muted)]">Current email</p>
              <p className="mt-1 font-medium text-[color:var(--ims-ink)]">{user.email}</p>
            </div>
            <div className="rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--ims-muted)]">Security</p>
              <p className="mt-1">Use Change Password when you need to update login credentials.</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <ProfileForm
            user={{
              fullName: user.fullName,
              email: user.email,
              phone: user.phone,
              userType: user.userType,
              status: user.status,
            }}
          />

          <Card>
            <CardHeader>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--ims-accent-soft)] text-[color:var(--ims-brass)]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <CardTitle>Password and access</CardTitle>
              <CardDescription>Profile edits do not touch your email or login password.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
