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
  Alert,
} from '@ims/shared-ui';
import type { Institute } from '@ims/organization';
import { createInstituteAction, updateInstituteAction, type ActionResult } from '@/app/(protected)/organization/actions';

export interface InstituteFormProps {
  mode: 'create' | 'edit' | 'view';
  initialData?: Institute;
}

export function InstituteForm({ mode, initialData }: InstituteFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      let res: ActionResult;
      if (mode === 'create') {
        res = await createInstituteAction({ success: false }, formData);
      } else if (mode === 'edit' && initialData) {
        res = await updateInstituteAction(initialData.id, { success: false }, formData);
      } else {
        return;
      }

      if (res.success) {
        router.push('/organization/institutes');
      } else if (res.error) {
        alert(res.error); // In a real app, wire to a toast or local state
      }
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Add New Institute' : mode === 'edit' ? 'Edit Institute' : 'Institute Details'}
        </CardTitle>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mode === 'create' && (
              <Input
                name="instituteCode"
                label="Institute Code"
                placeholder="HQ"
                defaultValue={initialData?.instituteCode}
                disabled={isView || isEdit}
                required
              />
            )}
            <Input
              name="instituteName"
              label="Institute Name"
              placeholder="Main Institute Name"
              defaultValue={initialData?.instituteName}
              disabled={isView}
              required
            />
            <Input
              name="registrationNumber"
              label="Registration Number"
              placeholder="e.g. CR-123456"
              defaultValue={initialData?.registrationNumber ?? ''}
              disabled={isView}
            />
            <Input
              name="taxNumber"
              label="Tax Number (VAT)"
              placeholder="e.g. TRN-123456"
              defaultValue={initialData?.taxNumber ?? ''}
              disabled={isView}
            />
            <Input
              name="primaryEmail"
              type="email"
              label="Primary Email"
              placeholder="admin@institute.com"
              defaultValue={initialData?.primaryEmail ?? ''}
              disabled={isView}
            />
            <Input
              name="primaryPhone"
              label="Primary Phone"
              placeholder="+123456789"
              defaultValue={initialData?.primaryPhone ?? ''}
              disabled={isView}
            />
            <Input
              name="website"
              label="Website URL"
              placeholder="https://institute.com"
              defaultValue={initialData?.website ?? ''}
              disabled={isView}
            />
            <Input
              name="country"
              label="Country"
              placeholder="Oman"
              defaultValue={initialData?.country ?? ''}
              disabled={isView}
            />
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <Input
              name="address"
              label="Address"
              placeholder="123 Main St, City"
              defaultValue={initialData?.address ?? ''}
              disabled={isView}
            />
          </div>

          {isEdit && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          {!isView && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/organization/institutes')}
              disabled={isPending}
            >
              Cancel
            </Button>
          )}
          {isView ? (
            <Button
              type="button"
              onClick={() => router.push(`/organization/institutes/${initialData?.id}/edit`)}
            >
              Edit Institute
            </Button>
          ) : (
            <Button type="submit" loading={isPending}>
              {mode === 'create' ? 'Create Institute' : 'Save Changes'}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
