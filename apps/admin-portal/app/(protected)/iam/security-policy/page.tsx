import React from 'react';
import { Breadcrumbs, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from '@ims/shared-ui';
import { Pencil, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { getSession } from '../../../lib/auth-guard';

export const metadata = { title: 'Security Policy | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function IamSecurityPolicyPage() {
  const session = await getSession();
  const { securityPolicyService } = await import('../../../lib/runtime');
  const policy = await securityPolicyService.getSecurityPolicy({ actorId: session.userId as never, actorPermissions: session.permissions, activeBranchId: session.activeBranchId as never });

  const rows = [
    ['Max failed attempts', policy.maxFailedAttempts],
    ['Lockout duration (min)', policy.lockoutDurationMinutes],
    ['Password min length', policy.passwordMinLength],
    ['Password expiry (days)', policy.passwordExpiryDays],
    ['Reset token expiry (min)', policy.resetTokenExpiryMinutes],
    ['Access token expiry (min)', policy.accessTokenExpiryMinutes],
    ['Refresh token expiry (days)', policy.refreshTokenExpiryDays],
    ['Concurrent sessions', policy.maxConcurrentSessions],
  ] as const;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Access Control"
        title="Security Policy"
        description="Review the active IAM policy values that control sign-in, resets, and sessions."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'IAM', href: '/iam' }, { label: 'Security Policy' }]} />}
        actions={
          <Link href="/iam/security-policy/edit">
            <Button>
              <Pencil className="mr-2 h-4 w-4" /> Edit Policy
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Current policy</CardTitle>
          <CardDescription>These values are enforced by the backend and surfaced here for operational review.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setting</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(([label, value]) => (
                <TableRow key={label}>
                  <TableCell>{label}</TableCell>
                  <TableCell><Badge variant="default">{String(value)}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
