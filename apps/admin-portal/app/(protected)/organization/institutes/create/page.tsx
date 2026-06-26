import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { InstituteForm } from '@/app/(protected)/organization/institutes/institute-form';

export const metadata = { title: 'Add Institute | IMS Admin' };

export default function CreateInstitutePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Add New Institute"
        description="Create a new top-level organization entity."
        backUrl="/organization/institutes"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Organization', href: '/organization' },
              { label: 'Institutes', href: '/organization/institutes' },
              { label: 'Add Institute' },
            ]}
          />
        }
      />
      <InstituteForm mode="create" />
    </div>
  );
}
