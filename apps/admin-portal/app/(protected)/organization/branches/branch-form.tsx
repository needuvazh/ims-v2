'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Button,
  Input,
  Select,
} from '@ims/shared-ui';
import type { Branch, Institute } from '@ims/organization';
import { createBranchAction, updateBranchAction, type ActionResult } from '@/app/(protected)/organization/actions';

export interface BranchFormProps {
  mode: 'create' | 'edit' | 'view';
  initialData?: Branch;
  institutes: Institute[];
  users: { id: string; fullName: string; email: string }[];
}

export function BranchForm({ mode, initialData, institutes, users }: BranchFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  const instituteOptions = institutes.map((i) => ({ value: i.id, label: i.instituteName }));
  const userOptions = users.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }));

  const formatDateForInput = (date: Date | string | null | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      let res: ActionResult;
      if (mode === 'create') {
        res = await createBranchAction({ success: false }, formData);
      } else if (mode === 'edit' && initialData) {
        res = await updateBranchAction(initialData.id, { success: false }, formData);
      } else {
        return;
      }

      if (res.success) {
        router.push('/organization/branches');
      } else if (res.error) {
        alert(res.error); 
      }
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Add New Branch' : mode === 'edit' ? 'Edit Branch' : 'Branch Details'}
        </CardTitle>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mode === 'create' && (
              <>
                <Select
                  name="instituteId"
                  label="Institute"
                  options={instituteOptions}
                  defaultValue={initialData?.instituteId}
                  disabled={isView || isEdit}
                  required
                />
                <Input
                  name="branchCode"
                  label="Branch Code"
                  placeholder="e.g. BR-01"
                  defaultValue={initialData?.branchCode}
                  disabled={isView || isEdit}
                  required
                />
              </>
            )}
            
            <Input
              name="branchName"
              label="Branch Name"
              placeholder="e.g. Main Campus"
              defaultValue={initialData?.branchName}
              disabled={isView}
              required
            />
            <Select
              name="branchManagerId"
              label="Branch Manager"
              options={userOptions}
              defaultValue={initialData?.branchManagerId ?? ''}
              placeholder="Select Manager (Optional)"
              disabled={isView}
            />
            <Input
              name="city"
              label="City"
              placeholder="e.g. Muscat"
              defaultValue={initialData?.city ?? ''}
              disabled={isView}
            />
            <Input
              name="country"
              label="Country"
              placeholder="e.g. Oman"
              defaultValue={initialData?.country ?? ''}
              disabled={isView}
            />
            <Input
              name="email"
              type="email"
              label="Branch Email"
              placeholder="branch@institute.com"
              defaultValue={initialData?.email ?? ''}
              disabled={isView}
            />
            <Input
              name="phone"
              label="Branch Phone"
              placeholder="+123456789"
              defaultValue={initialData?.phone ?? ''}
              disabled={isView}
            />
            <Input
              name="effectiveStartDate"
              type="date"
              label="Effective Start Date"
              defaultValue={formatDateForInput(initialData?.effectiveStartDate)}
              disabled={isView}
            />
            <Input
              name="effectiveEndDate"
              type="date"
              label="Effective End Date"
              defaultValue={formatDateForInput(initialData?.effectiveEndDate)}
              disabled={isView}
            />
            
            {isEdit && (
              <Select
                name="status"
                label="Status"
                options={[
                  { value: 'Active', label: 'Active' },
                  { value: 'Inactive', label: 'Inactive' },
                  { value: 'Draft', label: 'Draft' },
                  { value: 'Archived', label: 'Archived' },
                ]}
                defaultValue={initialData?.status}
                disabled={isView}
              />
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          {!isView && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/organization/branches')}
              disabled={isPending}
            >
              Cancel
            </Button>
          )}
          {isView ? (
            <Button
              type="button"
              onClick={() => router.push(`/organization/branches/${initialData?.id}/edit`)}
            >
              Edit Branch
            </Button>
          ) : (
            <Button type="submit" loading={isPending}>
              {mode === 'create' ? 'Create Branch' : 'Save Changes'}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
