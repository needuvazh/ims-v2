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
import type { Institute } from '@ims/organization';
import { createInstituteAction, updateInstituteAction, type ActionResult } from '@/app/(protected)/organization/actions';
import { clearErrorField, getFieldValidationMessage } from '@/app/(protected)/organization/validation';

export interface InstituteFormProps {
  mode: 'create' | 'edit' | 'view';
  initialData?: Institute;
}

const COUNTRY_OPTIONS = [
  { value: 'Oman', label: 'Oman' },
  { value: 'United Arab Emirates', label: 'United Arab Emirates' },
  { value: 'Saudi Arabia', label: 'Saudi Arabia' },
  { value: 'Qatar', label: 'Qatar' },
  { value: 'Bahrain', label: 'Bahrain' },
  { value: 'Kuwait', label: 'Kuwait' },
  { value: 'India', label: 'India' },
  { value: 'Other', label: 'Other' },
];

type InstituteFormValues = {
  instituteCode: string;
  instituteName: string;
  registrationNumber: string;
  taxNumber: string;
  primaryEmail: string;
  primaryPhone: string;
  website: string;
  address: string;
  country: string;
  status: string;
};

function buildInstituteValues(initialData?: Institute): InstituteFormValues {
  return {
    instituteCode: initialData?.instituteCode ?? '',
    instituteName: initialData?.instituteName ?? '',
    registrationNumber: initialData?.registrationNumber ?? '',
    taxNumber: initialData?.taxNumber ?? '',
    primaryEmail: initialData?.primaryEmail ?? '',
    primaryPhone: initialData?.primaryPhone ?? '',
    website: initialData?.website ?? '',
    address: initialData?.address ?? '',
    country: initialData?.country ?? 'Oman',
    status: initialData?.status ?? 'Active',
  };
}

export function InstituteForm({ mode, initialData }: InstituteFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<InstituteFormValues>(() => buildInstituteValues(initialData));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const res =
        mode === 'create'
          ? await createInstituteAction(prev, formData)
          : mode === 'edit' && initialData
            ? await updateInstituteAction(initialData.id, prev, formData)
            : prev;

      if (res.success) {
        router.push('/organization/institutes');
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

  const updateField = (field: keyof InstituteFormValues) => (value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    clearErrorField(setFieldErrors, field);
  };

  const handleTextChange = (field: keyof InstituteFormValues) => (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    updateField(field)(e.target.value);
  };

  const handleSelectChange = (field: keyof InstituteFormValues) => (
    e: ChangeEvent<HTMLSelectElement>,
  ) => {
    updateField(field)(e.target.value);
  };

  const handleInvalid = (field: keyof InstituteFormValues, label: string) => (
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Add New Institute' : mode === 'edit' ? 'Edit Institute' : 'Institute Details'}
        </CardTitle>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-6">
          {state.error && !state.fieldErrors && <Alert variant="error" description={state.error} />}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mode === 'create' && (
              <Input
                name="instituteCode"
              label="Institute Code"
              placeholder="e.g. MCT-01"
              pattern=".*\\S.*"
              value={values.instituteCode}
                disabled={isView || isEdit}
                required
                onChange={handleTextChange('instituteCode')}
                onInvalidCapture={handleInvalid('instituteCode', 'Institute Code')}
                errorText={fieldErrors.instituteCode}
              />
            )}
            <Input
              name="instituteName"
              label="Institute Name"
              placeholder="e.g. Oman Future Institute"
              pattern=".*\\S.*"
              value={values.instituteName}
              disabled={isView}
              required
              onChange={handleTextChange('instituteName')}
              onInvalidCapture={handleInvalid('instituteName', 'Institute Name')}
              errorText={fieldErrors.instituteName}
            />
            <Input
              name="registrationNumber"
              label="Registration Number"
              placeholder="e.g. CR-1234567"
              value={values.registrationNumber}
              disabled={isView}
              onChange={handleTextChange('registrationNumber')}
              errorText={fieldErrors.registrationNumber}
            />
            <Input
              name="taxNumber"
              label="Tax Number (VAT)"
              placeholder="e.g. OM123456789"
              value={values.taxNumber}
              disabled={isView}
              onChange={handleTextChange('taxNumber')}
              errorText={fieldErrors.taxNumber}
            />
            <Input
              name="primaryEmail"
              type="email"
              label="Primary Email"
              placeholder="info@institute.om"
              value={values.primaryEmail}
              disabled={isView}
              onChange={handleTextChange('primaryEmail')}
              onInvalidCapture={handleInvalid('primaryEmail', 'Primary Email')}
              errorText={fieldErrors.primaryEmail}
            />
            <Input
              name="primaryPhone"
              label="Primary Phone"
              placeholder="+968 9123 4567"
              value={values.primaryPhone}
              disabled={isView}
              onChange={handleTextChange('primaryPhone')}
              errorText={fieldErrors.primaryPhone}
            />
            <Input
              name="website"
              label="Website URL"
              placeholder="https://institute.om"
              value={values.website}
              disabled={isView}
              type="url"
              onChange={handleTextChange('website')}
              onInvalidCapture={handleInvalid('website', 'Website URL')}
              errorText={fieldErrors.website}
            />
            <Select
              name="country"
              label="Country"
              options={COUNTRY_OPTIONS}
              value={values.country}
              disabled={isView}
              onChange={handleSelectChange('country')}
              onInvalidCapture={handleInvalid('country', 'Country')}
              errorText={fieldErrors.country}
            />
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Input
              name="address"
              label="Address"
              placeholder="Building 123, Way 456, Al Seeb, Muscat"
              value={values.address}
              disabled={isView}
              onChange={handleTextChange('address')}
              errorText={fieldErrors.address}
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
                value={values.status}
                disabled={isView}
                onChange={handleSelectChange('status')}
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
