'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Select, FormLabel } from '@ims/shared-ui';

interface Option {
  id: string;
  name: string;
}

interface ReportsFilterProps {
  branches: Option[];
  batches: Option[];
  selectedBranchId: string;
  selectedBatchId: string;
}

export function ReportsFilter({
  branches,
  batches,
  selectedBranchId,
  selectedBatchId,
}: ReportsFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleBranchChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('branchId', val);
    params.delete('batchId'); // Clear batch filter when branch changes
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleBatchChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set('batchId', val);
    } else {
      params.delete('batchId');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="grid gap-4 rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-5 shadow-sm sm:grid-cols-2">
      <div>
        <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
          Select Branch
        </FormLabel>
        <Select
          value={selectedBranchId}
          onValueChange={handleBranchChange}
          options={branches.map((b) => ({ value: b.id, label: b.name }))}
          placeholder="Choose branch..."
          className="h-11"
        />
      </div>

      <div>
        <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
          Select Batch
        </FormLabel>
        <Select
          value={selectedBatchId}
          onValueChange={handleBatchChange}
          options={[
            { value: '', label: 'Select a batch to analyze...' },
            ...batches.map((b) => ({ value: b.id, label: b.name })),
          ]}
          placeholder="Choose batch..."
          className="h-11"
        />
      </div>
    </div>
  );
}
