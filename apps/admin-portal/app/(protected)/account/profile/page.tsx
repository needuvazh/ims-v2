import {
  Breadcrumbs,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  AdminDetailPageLayout,
} from '@ims/shared-ui';
import { UserCircle2, ShieldCheck } from 'lucide-react';
import { getSession } from '../../../lib/auth-guard';
import { userService, prisma } from '../../../lib/runtime';
import { ProfileForm } from './profile-form';

export const metadata = { title: 'My Profile | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await getSession();
  const user = await userService.getUser(session.userId);

  // Fetch active sessions for this user
  const activeSessions = await prisma.userSession.findMany({
    where: {
      userId: session.userId,
      status: 'Active',
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastAccessAt: 'desc' },
  });

  // Fetch login history for this user (up to 50 records for "View More")
  const loginHistory = await prisma.loginHistory.findMany({
    where: {
      userId: session.userId,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <AdminDetailPageLayout>
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

      <ProfileForm
        user={{
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          userType: user.userType,
          status: user.status,
          photoUrl: user.photoUrl ?? null,
        }}
        activeSessions={activeSessions.map((s) => ({
          id: s.id,
          userAgent: s.userAgent,
          ipAddress: s.ipAddress,
          lastAccessAt: s.lastAccessAt.toISOString(),
          tokenHash: s.tokenHash,
        }))}
        loginHistory={loginHistory.map((lh) => ({
          id: lh.id,
          ipAddress: lh.ipAddress,
          userAgent: lh.userAgent,
          browser: lh.browser,
          os: lh.os,
          device: lh.device,
          status: lh.status,
          failureReason: lh.failureReason,
          createdAt: lh.createdAt.toISOString(),
        }))}
        currentSessionJti={session.accessTokenJti}
      />
    </AdminDetailPageLayout>
  );
}

