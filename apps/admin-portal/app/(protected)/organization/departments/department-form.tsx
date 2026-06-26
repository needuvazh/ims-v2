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
import type { Department, Branch } from '@ims/organization';
import { createDepartmentAction, updateDepartmentAction, type ActionResult } from '@/app/(protected)/organization/actions';

export interface DepartmentFormProps {
  mode: 'create' | 'edit' | 'view';
  initialData?: Department;
  branches: Branch[];
  users: { id: string; fullName: string; email: string }[];
}

export function DepartmentForm({ mode, initialData, branches, users }: DepartmentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  const branchOptions = branches.map((b) => ({ value: b.id, label: b.branchName }));
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
        res = await createDepartmentAction({ success: false }, formData);
      } else if (mode === 'edit' && initialData) {
        res = await updateDepartmentAction(initialData.id, { success: false }, formData);
      } else {
        return;
      }

      if (res.success) {
        router.push('/organization/departments');
      } else if (res.error) {
        alert(res.error); 
      }
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Add New Department' : mode === 'edit' ? 'Edit Department' : 'Department Details'}
        </CardTitle>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mode === 'create' && (
              <>
                <Select
                  name="branchId"
                  label="Branch"
                  options={branchOptions}
                  defaultValue={initialData?.branchId}
                  disabled={isView || isEdit}
                  required
                />
                <Input
                  name="departmentCode"
                  label="Department Code"
                  placeholder="e.g. IT-DEPT"
                  defaultValue={initialData?.departmentCode}
                  disabled={isView || isEdit}
                  required
                />
              </>
            )}
            
            <Input
              name="departmentName"
              label="Department Name"
              placeholder="e.g. Information Technology"
              defaultValue={initialData?.departmentName}
              disabled={isView}
              required
            />
            <Select
              name="departmentHeadId"
              label="Department Head"
              options={userOptions}
              defaultValue={initialData?.departmentHeadId ?? ''}
              placeholder="Select Head (Optional)"
              disabled={isView}
            />
            <div className="md:col-span-2">
              <Input
                name="description"
                label="Description"
                placeholder="Course offerings in software, databases, and IT"
                defaultValue={initialData?.description ?? ''}
                disabled={isView}
              />
            </div>
            
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
              onClick={() => router.push('/organization/departments')}
              disabled={isPending}
            >
              Cancel
            </Button>
          )}
          {isView ? (
            <Button
              type="button"
              onClick={() => router.push(`/organization/departments/${initialData?.id}/edit`)}
            >
              Edit Department
            </Button>
          ) : (
            <Button type="submit" loading={isPending}>
              {mode === 'create' ? 'Create Department' : 'Save Changes'}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
