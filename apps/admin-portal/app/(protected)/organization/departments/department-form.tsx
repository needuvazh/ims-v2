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
import type { Department, Branch } from '@ims/organization';
import { createDepartmentAction, updateDepartmentAction, type ActionResult } from '@/app/(protected)/organization/actions';
import { clearErrorField, getFieldValidationMessage } from '@/app/(protected)/organization/validation';

export interface DepartmentFormProps {
  mode: 'create' | 'edit' | 'view';
  initialData?: Department;
  branches: Branch[];
  users: { id: string; fullName: string; email: string }[];
}

type DepartmentFormValues = {
  branchId: string;
  departmentCode: string;
  departmentName: string;
  departmentHeadId: string;
  description: string;
  effectiveStartDate: string;
  effectiveEndDate: string;
  status: string;
};

function formatDateForInput(date: Date | string | null | undefined) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

function buildDepartmentValues(initialData?: Department): DepartmentFormValues {
  return {
    branchId: initialData?.branchId ?? '',
    departmentCode: initialData?.departmentCode ?? '',
    departmentName: initialData?.departmentName ?? '',
    departmentHeadId: initialData?.departmentHeadId ?? '',
    description: initialData?.description ?? '',
    effectiveStartDate: formatDateForInput(initialData?.effectiveStartDate),
    effectiveEndDate: formatDateForInput(initialData?.effectiveEndDate),
    status: initialData?.status ?? 'Active',
  };
}

export function DepartmentForm({ mode, initialData, branches, users }: DepartmentFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<DepartmentFormValues>(() => buildDepartmentValues(initialData));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const res =
        mode === 'create'
          ? await createDepartmentAction(prev, formData)
          : mode === 'edit' && initialData
            ? await updateDepartmentAction(initialData.id, prev, formData)
            : prev;

      if (res.success) {
        router.push('/organization/departments');
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

  const updateField = (field: keyof DepartmentFormValues) => (value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    clearErrorField(setFieldErrors, field);
  };

  const handleTextChange = (field: keyof DepartmentFormValues) => (
    e: ChangeEvent<HTMLInputElement>,
  ) => updateField(field)(e.target.value);

  const handleSelectChange = (field: keyof DepartmentFormValues) => (
    e: ChangeEvent<HTMLSelectElement>,
  ) => updateField(field)(e.target.value);

  const handleInvalid = (field: keyof DepartmentFormValues, label: string) => (
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
  const branchOptions = branches.map((b) => ({ value: b.id, label: b.branchName }));
  const userOptions = users.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Add New Department' : mode === 'edit' ? 'Edit Department' : 'Department Details'}
        </CardTitle>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-6">
          {state.error && !state.fieldErrors && <Alert variant="error" description={state.error} />}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mode === 'create' && (
              <>
                <Select
                  name="branchId"
                  label="Branch"
                  options={branchOptions}
                  value={values.branchId}
                  disabled={isView || isEdit}
                  required
                  onChange={handleSelectChange('branchId')}
                  onInvalidCapture={handleInvalid('branchId', 'Branch')}
                  errorText={fieldErrors.branchId}
                />
                <Input
                  name="departmentCode"
                  label="Department Code"
                  placeholder="e.g. IT-DEPT"
                  pattern=".*\\S.*"
                  value={values.departmentCode}
                  disabled={isView || isEdit}
                  required
                  onChange={handleTextChange('departmentCode')}
                  onInvalidCapture={handleInvalid('departmentCode', 'Department Code')}
                  errorText={fieldErrors.departmentCode}
                />
              </>
            )}

            <Input
              name="departmentName"
              label="Department Name"
              placeholder="e.g. Information Technology"
              pattern=".*\\S.*"
              value={values.departmentName}
              disabled={isView}
              required
              onChange={handleTextChange('departmentName')}
              onInvalidCapture={handleInvalid('departmentName', 'Department Name')}
              errorText={fieldErrors.departmentName}
            />
            <Select
              name="departmentHeadId"
              label="Department Head"
              options={userOptions}
              value={values.departmentHeadId}
              placeholder="Select Head (Optional)"
              disabled={isView}
              onChange={handleSelectChange('departmentHeadId')}
              onInvalidCapture={handleInvalid('departmentHeadId', 'Department Head')}
              errorText={fieldErrors.departmentHeadId}
            />
            <div className="md:col-span-2">
              <Input
                name="description"
                label="Description"
                placeholder="Course offerings in software, databases, and IT"
                value={values.description}
                disabled={isView}
                onChange={handleTextChange('description')}
                errorText={fieldErrors.description}
              />
            </div>

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
