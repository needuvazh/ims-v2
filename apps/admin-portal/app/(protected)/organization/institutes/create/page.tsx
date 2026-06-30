import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { InstituteForm } from '@/app/(protected)/organization/institutes/institute-form';
import { Home, Building2, Building, Plus } from 'lucide-react';

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
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Organization', href: '/organization', icon: <Building2 className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Institutes', href: '/organization/institutes', icon: <Building className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Add Institute', icon: <Plus className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />
      <InstituteForm mode="create" />
    </div>
  );
}
