'use client';

import { useActionState, useEffect, useState, type ChangeEvent, type InvalidEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Globe, Shield, Calendar, Landmark } from 'lucide-react';
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

const CURRENCY_OPTIONS = [
  { value: 'OMR', label: 'OMR - Omani Rial' },
  { value: 'AED', label: 'AED - United Arab Emirates Dirham' },
  { value: 'SAR', label: 'SAR - Saudi Riyal' },
  { value: 'BHD', label: 'BHD - Bahraini Dinar' },
  { value: 'QAR', label: 'QAR - Qatari Riyal' },
  { value: 'KWD', label: 'KWD - Kuwaiti Dinar' },
  { value: 'USD', label: 'USD - United States Dollar' },
  { value: 'INR', label: 'INR - Indian Rupee' },
];

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Muscat', label: 'Asia/Muscat (GMT+4)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GMT+4)' },
  { value: 'Asia/Riyadh', label: 'Asia/Riyadh (GMT+3)' },
  { value: 'Asia/Bahrain', label: 'Asia/Bahrain (GMT+3)' },
  { value: 'Asia/Qatar', label: 'Asia/Qatar (GMT+3)' },
  { value: 'Asia/Kuwait', label: 'Asia/Kuwait (GMT+3)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (GMT+5:30)' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
];

const LANGUAGE_OPTIONS = [
  { value: 'ar', label: 'Arabic' },
  { value: 'en', label: 'English' },
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
  legalNameEnglish: string;
  legalNameArabic: string;
  tradeName: string;
  shortName: string;
  effectiveStartDate: string;
  effectiveEndDate: string;
  currency: string;
  timezone: string;
  language: string;
};

function formatDateForInput(date: Date | string | null | undefined) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

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
    legalNameEnglish: (initialData as any)?.legalNameEnglish ?? '',
    legalNameArabic: (initialData as any)?.legalNameArabic ?? '',
    tradeName: (initialData as any)?.tradeName ?? '',
    shortName: (initialData as any)?.shortName ?? '',
    effectiveStartDate: formatDateForInput((initialData as any)?.effectiveStartDate),
    effectiveEndDate: formatDateForInput((initialData as any)?.effectiveEndDate),
    currency: (initialData as any)?.currency ?? 'OMR',
    timezone: (initialData as any)?.timezone ?? 'Asia/Muscat',
    language: (initialData as any)?.language ?? 'ar',
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

  useEffect(() => {
    if (state.values) {
      setValues((prev) => ({
        ...prev,
        ...state.values,
      }));
    }
  }, [state.values]);

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
    <form action={formAction} noValidate className="space-y-8">
      {state.error && <Alert variant="error" description={state.error} />}

      {/* 1. Basic Information Card */}
      <div className="bg-[color:var(--ims-surface)] rounded-2xl border border-[color:var(--ims-border)] overflow-hidden shadow-sm">
        <div className="relative h-32 overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent flex items-end p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg text-white">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-wide">Basic Profile</h3>
                <p className="text-xs text-slate-200 opacity-90">Core identity parameters of the training institute</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {mode === 'create' ? (
            <Input
              name="instituteCode"
              label="Institute Code"
              placeholder="e.g. MCT-01"
              pattern=".*\S.*"
              value={values.instituteCode}
              disabled={isView || isEdit}
              required
              onChange={handleTextChange('instituteCode')}
              onInvalidCapture={handleInvalid('instituteCode', 'Institute Code')}
              errorText={fieldErrors.instituteCode}
            />
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">Institute Code</label>
              <div className="text-sm font-mono font-medium p-2 bg-[color:var(--ims-surface-hover)] border border-[color:var(--ims-border)] rounded-md">
                {values.instituteCode}
              </div>
            </div>
          )}
          <Input
            name="instituteName"
            label="Institute Name"
            placeholder="e.g. ASTI Training Institute"
            pattern=".*\S.*"
            value={values.instituteName}
            disabled={isView}
            required
            onChange={handleTextChange('instituteName')}
            onInvalidCapture={handleInvalid('instituteName', 'Institute Name')}
            errorText={fieldErrors.instituteName}
          />
          <Input
            name="shortName"
            label="Short Name"
            placeholder="e.g. ASTI"
            value={values.shortName}
            disabled={isView}
            onChange={handleTextChange('shortName')}
            errorText={fieldErrors.shortName}
          />
          <Input
            name="tradeName"
            label="Trade Name"
            placeholder="e.g. ASTI Academy"
            value={values.tradeName}
            disabled={isView}
            onChange={handleTextChange('tradeName')}
            errorText={fieldErrors.tradeName}
          />
        </div>
      </div>

      {/* 2. Localized & Legal Information */}
      <div className="bg-[color:var(--ims-surface)] rounded-2xl border border-[color:var(--ims-border)] overflow-hidden shadow-sm">
        <div className="relative h-32 overflow-hidden bg-gradient-to-r from-purple-900 via-pink-900 to-rose-900">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent flex items-end p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg text-white">
                <Landmark className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-wide">Legal & Localized Identity</h3>
                <p className="text-xs text-slate-200 opacity-90">Official names and government registry settings</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            name="legalNameEnglish"
            label="Legal Name (English)"
            placeholder="Official Registered Name in English"
            value={values.legalNameEnglish}
            disabled={isView}
            onChange={handleTextChange('legalNameEnglish')}
            errorText={fieldErrors.legalNameEnglish}
          />
          <Input
            name="legalNameArabic"
            label="Legal Name (Arabic)"
            placeholder="Official Registered Name in Arabic"
            value={values.legalNameArabic}
            disabled={isView}
            onChange={handleTextChange('legalNameArabic')}
            errorText={fieldErrors.legalNameArabic}
          />
          <Input
            name="registrationNumber"
            label="Registration Number (CR)"
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
        </div>
      </div>

      {/* 3. Regional & Operational Defaults */}
      <div className="bg-[color:var(--ims-surface)] rounded-2xl border border-[color:var(--ims-border)] overflow-hidden shadow-sm">
        <div className="relative h-32 overflow-hidden bg-gradient-to-r from-amber-800 via-orange-800 to-red-800">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent flex items-end p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg text-white">
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-wide">Regional & Local Defaults</h3>
                <p className="text-xs text-slate-200 opacity-90">Default system settings for currency, timezone, and language</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
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
          <Select
            name="currency"
            label="Default Currency"
            options={CURRENCY_OPTIONS}
            value={values.currency}
            disabled={isView}
            onChange={handleSelectChange('currency')}
            errorText={fieldErrors.currency}
          />
          <Select
            name="timezone"
            label="Timezone"
            options={TIMEZONE_OPTIONS}
            value={values.timezone}
            disabled={isView}
            onChange={handleSelectChange('timezone')}
            errorText={fieldErrors.timezone}
          />
          <Select
            name="language"
            label="Default Language"
            options={LANGUAGE_OPTIONS}
            value={values.language}
            disabled={isView}
            onChange={handleSelectChange('language')}
            errorText={fieldErrors.language}
          />
        </div>
      </div>

      {/* 4. Contact Details & Effective Period */}
      <div className="bg-[color:var(--ims-surface)] rounded-2xl border border-[color:var(--ims-border)] overflow-hidden shadow-sm">
        <div className="relative h-32 overflow-hidden bg-gradient-to-r from-teal-900 via-emerald-900 to-green-900">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent flex items-end p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg text-white">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-wide">Contacts & Operational Period</h3>
                <p className="text-xs text-slate-200 opacity-90">Addresses, primary phone/email, and lifecycle dates</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            name="primaryEmail"
            type="email"
            label="Primary Email"
            placeholder="info@asti.edu.om"
            value={values.primaryEmail}
            disabled={isView}
            onChange={handleTextChange('primaryEmail')}
            onInvalidCapture={handleInvalid('primaryEmail', 'Primary Email')}
            errorText={fieldErrors.primaryEmail}
          />
          <Input
            name="primaryPhone"
            label="Primary Phone"
            placeholder="+968 2456 7890"
            value={values.primaryPhone}
            disabled={isView}
            onChange={handleTextChange('primaryPhone')}
            errorText={fieldErrors.primaryPhone}
          />
          <Input
            name="website"
            label="Website URL"
            placeholder="https://asti.edu.om"
            value={values.website}
            disabled={isView}
            type="url"
            onChange={handleTextChange('website')}
            onInvalidCapture={handleInvalid('website', 'Website URL')}
            errorText={fieldErrors.website}
          />
          <Input
            name="address"
            label="Address"
            placeholder="Building 123, Way 456, Al Seeb, Muscat"
            value={values.address}
            disabled={isView}
            onChange={handleTextChange('address')}
            errorText={fieldErrors.address}
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

          {(isEdit || isView) && (
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
      </div>

      <div className="flex justify-end gap-3">
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
      </div>
    </form>
  );
}
