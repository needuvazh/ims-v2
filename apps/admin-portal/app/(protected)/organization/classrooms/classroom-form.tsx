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
import type { Classroom, Branch } from '@ims/organization';
import { createClassroomAction, updateClassroomAction, type ActionResult } from '@/app/(protected)/organization/actions';

export interface ClassroomFormProps {
  mode: 'create' | 'edit' | 'view';
  initialData?: Classroom;
  branches: Branch[];
}

export function ClassroomForm({ mode, initialData, branches }: ClassroomFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  const branchOptions = branches.map((b) => ({ value: b.id, label: b.branchName }));

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
        res = await createClassroomAction({ success: false }, formData);
      } else if (mode === 'edit' && initialData) {
        res = await updateClassroomAction(initialData.id, { success: false }, formData);
      } else {
        return;
      }

      if (res.success) {
        router.push('/organization/classrooms');
      } else if (res.error) {
        alert(res.error); 
      }
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Add New Classroom' : mode === 'edit' ? 'Edit Classroom' : 'Classroom Details'}
        </CardTitle>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mode === 'create' && (
              <Select
                name="branchId"
                label="Branch"
                options={branchOptions}
                defaultValue={initialData?.branchId}
                disabled={isView || isEdit}
                required
              />
            )}
            
            <Input
              name="classroomName"
              label="Classroom Name / Number"
              placeholder="e.g. Lab 101"
              defaultValue={initialData?.classroomName}
              disabled={isView}
              required
            />
            <Input
              name="capacity"
              type="number"
              label="Capacity (Seats)"
              placeholder="e.g. 24"
              defaultValue={initialData ? String(initialData.capacity) : ''}
              disabled={isView}
              required
            />
            <Input
              name="location"
              label="Location / Floor"
              placeholder="e.g. 1st Floor, Building B"
              defaultValue={initialData?.location ?? ''}
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
              onClick={() => router.push('/organization/classrooms')}
              disabled={isPending}
            >
              Cancel
            </Button>
          )}
          {isView ? (
            <Button
              type="button"
              onClick={() => router.push(`/organization/classrooms/${initialData?.id}/edit`)}
            >
              Edit Classroom
            </Button>
          ) : (
            <Button type="submit" loading={isPending}>
              {mode === 'create' ? 'Create Classroom' : 'Save Changes'}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
