import { Card, PageHeader } from '@ims/shared-ui';

export default function StudentCertificatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Protected"
        title="Certificates"
        description="Placeholder for issued certificate history and verification links."
      />
      <Card>
        <p className="text-sm text-[color:var(--ims-muted)]">Certificate issuance remains owned by the certificates package.</p>
      </Card>
    </div>
  );
}
