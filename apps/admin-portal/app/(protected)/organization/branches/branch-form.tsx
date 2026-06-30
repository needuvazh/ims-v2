'use client';

import { useActionState, useEffect, useState, type ChangeEvent, type InvalidEvent } from 'react';
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
import type { Branch, Institute } from '@ims/organization';
import { createBranchAction, updateBranchAction, type ActionResult } from '@/app/(protected)/organization/actions';
import { clearErrorField, getFieldValidationMessage } from '@/app/(protected)/organization/validation';

export interface BranchFormProps {
  mode: 'create' | 'edit' | 'view';
  initialData?: Branch;
  institutes: Institute[];
  users: { id: string; fullName: string; email: string }[];
}

type BranchFormValues = {
  instituteId: string;
  branchCode: string;
  branchName: string;
  branchManagerId: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  effectiveStartDate: string;
  effectiveEndDate: string;
  status: string;
};

function buildBranchValues(initialData?: Branch): BranchFormValues {
  return {
    instituteId: initialData?.instituteId ?? '',
    branchCode: initialData?.branchCode ?? '',
    branchName: initialData?.branchName ?? '',
    branchManagerId: initialData?.branchManagerId ?? '',
    city: initialData?.city ?? '',
    country: initialData?.country ?? '',
    email: initialData?.email ?? '',
    phone: initialData?.phone ?? '',
    effectiveStartDate: formatDateForInput(initialData?.effectiveStartDate),
    effectiveEndDate: formatDateForInput(initialData?.effectiveEndDate),
    status: initialData?.status ?? 'Active',
  };
}

function formatDateForInput(date: Date | string | null | undefined) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

export function BranchForm({ mode, initialData, institutes, users }: BranchFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<BranchFormValues>(() => buildBranchValues(initialData));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const res =
        mode === 'create'
          ? await createBranchAction(prev, formData)
          : mode === 'edit' && initialData
            ? await updateBranchAction(initialData.id, prev, formData)
            : prev;

      if (res.success) {
        router.push('/organization/branches');
      }

      return res;
    },
    { success: false },
  );

  useEffect(() => {
    if (state.fieldErrors) {
      setFieldErrors(state.fieldErrors);
    }
  }, [state.fieldErrors]);

  useEffect(() => {
    if (state.success) {
      setFieldErrors({});
    }
  }, [state.success]);

  useEffect(() => {
    if (state.values) {
      setValues((prev) => ({
        ...prev,
        ...state.values,
      }));
    }
  }, [state.values]);

  const updateField = (field: keyof BranchFormValues) => (value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    clearErrorField(setFieldErrors, field);
  };

  const handleTextChange = (field: keyof BranchFormValues) => (
    e: ChangeEvent<HTMLInputElement>,
  ) => updateField(field)(e.target.value);

  const handleSelectChange = (field: keyof BranchFormValues) => (
    e: ChangeEvent<HTMLSelectElement>,
  ) => updateField(field)(e.target.value);

  const handleInvalid = (field: keyof BranchFormValues, label: string) => (
    e: InvalidEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const target = e.currentTarget;
    setFieldErrors((prev) => ({
      ...prev,
      [field]: getFieldValidationMessage(target, label, 'type' in target ? target.type : undefined),
    }));
  };

  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const instituteOptions = institutes.map((i) => ({ value: i.id, label: i.instituteName }));
  const userOptions = users.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Add New Branch' : mode === 'edit' ? 'Edit Branch' : 'Branch Details'}
        </CardTitle>
      </CardHeader>
      <form action={formAction} noValidate>
        <CardContent className="space-y-6">
          {state.error && <Alert variant="error" description={state.error} />}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mode === 'create' && (
              <>
                <Select
                  name="instituteId"
                  label="Institute"
                  options={instituteOptions}
                  value={values.instituteId}
                  disabled={isView || isEdit}
                  required
                  onChange={handleSelectChange('instituteId')}
                  onInvalidCapture={handleInvalid('instituteId', 'Institute')}
                  errorText={fieldErrors.instituteId}
                />
                <Input
                  name="branchCode"
                  label="Branch Code"
                  placeholder="e.g. BR-01"
                  pattern=".*\\S.*"
                  value={values.branchCode}
                  disabled={isView || isEdit}
                  required
                  onChange={handleTextChange('branchCode')}
                  onInvalidCapture={handleInvalid('branchCode', 'Branch Code')}
                  errorText={fieldErrors.branchCode}
                />
              </>
            )}

            <Input
              name="branchName"
              label="Branch Name"
              placeholder="e.g. Main Campus"
              pattern=".*\\S.*"
              value={values.branchName}
              disabled={isView}
              required
              onChange={handleTextChange('branchName')}
              onInvalidCapture={handleInvalid('branchName', 'Branch Name')}
              errorText={fieldErrors.branchName}
            />
            <Select
              name="branchManagerId"
              label="Branch Manager"
              options={userOptions}
              value={values.branchManagerId}
              placeholder="Select Manager (Optional)"
              disabled={isView}
              onChange={handleSelectChange('branchManagerId')}
              onInvalidCapture={handleInvalid('branchManagerId', 'Branch Manager')}
              errorText={fieldErrors.branchManagerId}
            />
            <Input
              name="city"
              label="City"
              placeholder="e.g. Muscat"
              value={values.city}
              disabled={isView}
              onChange={handleTextChange('city')}
              errorText={fieldErrors.city}
            />
            <Input
              name="country"
              label="Country"
              placeholder="e.g. Oman"
              value={values.country}
              disabled={isView}
              onChange={handleTextChange('country')}
              errorText={fieldErrors.country}
            />
            <Input
              name="email"
              type="email"
              label="Branch Email"
              placeholder="branch@institute.com"
              value={values.email}
              disabled={isView}
              onChange={handleTextChange('email')}
              onInvalidCapture={handleInvalid('email', 'Branch Email')}
              errorText={fieldErrors.email}
            />
            <Input
              name="phone"
              label="Branch Phone"
              placeholder="+123456789"
              value={values.phone}
              disabled={isView}
              onChange={handleTextChange('phone')}
              errorText={fieldErrors.phone}
            />
            <Input
              name="effectiveStartDate"
              type="date"
              label="Effective Start Date"
              value={values.effectiveStartDate}
              disabled={isView}
              onChange={handleTextChange('effectiveStartDate')}
              errorText={fieldErrors.effectiveStartDate}
            />
            <Input
              name="effectiveEndDate"
              type="date"
              label="Effective End Date"
              value={values.effectiveEndDate}
              disabled={isView}
              onChange={handleTextChange('effectiveEndDate')}
              errorText={fieldErrors.effectiveEndDate}
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
                value={values.status}
                disabled={isView}
                onChange={handleSelectChange('status')}
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
