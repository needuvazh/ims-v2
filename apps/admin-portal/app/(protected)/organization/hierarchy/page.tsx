import { Building2 } from 'lucide-react';
import { Breadcrumbs, PageHeader, EmptyState } from '@ims/shared-ui';
import { loadOrganizationData } from '@/app/(protected)/organization/shared-data';
import { HierarchyNode } from '@/app/(protected)/organization/hierarchy/hierarchy-node';

export const metadata = { title: 'Hierarchy View | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function HierarchyPage() {
  const data = await loadOrganizationData();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Organization"
        title="Hierarchy View"
        description="A complete tree view of all institutes, branches, departments, and classrooms."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Organization', href: '/organization' },
              { label: 'Hierarchy View' },
            ]}
          />
        }
      />

      <div className="rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-6 space-y-6">
        <h3 className="text-lg font-bold text-[color:var(--ims-ink)] flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[color:var(--ims-brass)]" /> Institute Hierarchy Tree
        </h3>

        {!data.hierarchy ? (
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="No hierarchy data"
            description="Verify that an institute is defined and active."
          />
        ) : (
          <div className="pl-2 border-l border-dashed border-[color:var(--ims-border)] space-y-4">
            <HierarchyNode node={data.hierarchy} />
          </div>
        )}
      </div>
    </div>
  );
}
