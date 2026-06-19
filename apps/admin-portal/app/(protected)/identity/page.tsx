import { Card, PageHeader } from '@ims/shared-ui';

export default function IdentityPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Protected workflow"
        title="Identity & Access"
        description="This placeholder page marks where dynamic RBAC, roles, permissions, and access policies will live."
      />
      <Card>
        <p className="text-sm text-[color:var(--ims-muted)]">
          The domain package exists; the full IAM feature set will be expanded in the next slice.
        </p>
      </Card>
    </div>
  );
}
