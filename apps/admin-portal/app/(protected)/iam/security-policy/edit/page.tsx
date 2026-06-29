import React from 'react';
import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { getSession } from '../../../../lib/auth-guard';
import { SecurityPolicyForm } from '../security-policy-form';
import { Home, ShieldCheck, Lock, Pencil } from 'lucide-react';

export const metadata = { title: 'Edit Security Policy | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function EditSecurityPolicyPage() {
  const session = await getSession();
  const { securityPolicyService } = await import('../../../../lib/runtime');
  const policy = await securityPolicyService.getSecurityPolicy({ actorId: session.userId as never, actorPermissions: session.permissions, activeBranchId: session.activeBranchId as never });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Edit Security Policy"
        backUrl="/iam/security-policy"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'IAM', href: '/iam', icon: <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Security Policy', href: '/iam/security-policy', icon: <Lock className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Edit', icon: <Pencil className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />

      <SecurityPolicyForm policy={policy} />
    </div>
  );
}
