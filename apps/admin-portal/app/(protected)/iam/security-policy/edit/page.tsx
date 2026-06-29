import React from 'react';
import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { getSession } from '../../../../lib/auth-guard';
import { SecurityPolicyForm } from '../security-policy-form';

export const metadata = { title: 'Edit Security Policy | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function EditSecurityPolicyPage() {
  const session = await getSession();
  const { securityPolicyService } = await import('../../../../lib/runtime');
  const policy = await securityPolicyService.getSecurityPolicy({ actorId: session.userId as never, actorPermissions: session.permissions, activeBranchId: session.activeBranchId as never });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Access Control"
        title="Edit Security Policy"
        description="Update the active IAM configuration."
        backUrl="/iam/security-policy"
        breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'IAM', href: '/iam' }, { label: 'Security Policy', href: '/iam/security-policy' }, { label: 'Edit' }]} />}
      />

      <SecurityPolicyForm policy={policy} />
    </div>
  );
}
