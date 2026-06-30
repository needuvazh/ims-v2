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
import type { Classroom, Branch } from '@ims/organization';
import { createClassroomAction, updateClassroomAction, type ActionResult } from '@/app/(protected)/organization/actions';
import { clearErrorField, getFieldValidationMessage } from '@/app/(protected)/organization/validation';

export interface ClassroomFormProps {
  mode: 'create' | 'edit' | 'view';
  initialData?: Classroom;
  branches: Branch[];
}

type ClassroomFormValues = {
  branchId: string;
  classroomName: string;
  capacity: string;
  location: string;
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

function buildClassroomValues(initialData?: Classroom): ClassroomFormValues {
  return {
    branchId: initialData?.branchId ?? '',
    classroomName: initialData?.classroomName ?? '',
    capacity: initialData ? String(initialData.capacity) : '',
    location: initialData?.location ?? '',
    effectiveStartDate: formatDateForInput(initialData?.effectiveStartDate),
    effectiveEndDate: formatDateForInput(initialData?.effectiveEndDate),
    status: initialData?.status ?? 'Active',
  };
}

export function ClassroomForm({ mode, initialData, branches }: ClassroomFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<ClassroomFormValues>(() => buildClassroomValues(initialData));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const res =
        mode === 'create'
          ? await createClassroomAction(prev, formData)
          : mode === 'edit' && initialData
            ? await updateClassroomAction(initialData.id, prev, formData)
            : prev;

      if (res.success) {
        router.push('/organization/classrooms');
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

  const updateField = (field: keyof ClassroomFormValues) => (value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    clearErrorField(setFieldErrors, field);
  };

  const handleTextChange = (field: keyof ClassroomFormValues) => (
    e: ChangeEvent<HTMLInputElement>,
  ) => updateField(field)(e.target.value);

  const handleSelectChange = (field: keyof ClassroomFormValues) => (
    e: ChangeEvent<HTMLSelectElement>,
  ) => updateField(field)(e.target.value);

  const handleInvalid = (field: keyof ClassroomFormValues, label: string) => (
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Add New Classroom' : mode === 'edit' ? 'Edit Classroom' : 'Classroom Details'}
        </CardTitle>
      </CardHeader>
      <form action={formAction} noValidate>
        <CardContent className="space-y-6">
          {state.error && <Alert variant="error" description={state.error} />}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mode === 'create' && (
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
            )}

            <Input
              name="classroomName"
              label="Classroom Name / Number"
              placeholder="e.g. Lab 101"
              pattern=".*\\S.*"
              value={values.classroomName}
              disabled={isView}
              required
              onChange={handleTextChange('classroomName')}
              onInvalidCapture={handleInvalid('classroomName', 'Classroom Name / Number')}
              errorText={fieldErrors.classroomName}
            />
            <Input
              name="capacity"
              type="number"
              label="Capacity (Seats)"
              placeholder="e.g. 24"
              value={values.capacity}
              disabled={isView}
              required
              min={1}
              step={1}
              onChange={handleTextChange('capacity')}
              onInvalidCapture={handleInvalid('capacity', 'Capacity (Seats)')}
              errorText={fieldErrors.capacity}
            />
            <Input
              name="location"
              label="Location / Floor"
              placeholder="e.g. 1st Floor, Building B"
              value={values.location}
              disabled={isView}
              onChange={handleTextChange('location')}
              errorText={fieldErrors.location}
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
