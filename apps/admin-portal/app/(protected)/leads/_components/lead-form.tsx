'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Compass, Activity, FileText, BadgeCheck, Loader2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateLeadSchema, LeadSourceEnum } from '@ims/crm-leads';
import {
  Input,
  Select,
  Textarea,
  FormField,
  FormLabel,
  FormControl,
  FormError,
  Button,
  Alert,
} from '@ims/shared-ui';

type StudentLookupResult = {
  personFound: boolean;
  personId: string | null;
  firstNameMasked: string | null;
  lastNameMasked: string | null;
  maskedMobile: string | null;
  maskedEmail: string | null;
  maskedNationalId?: string | null;
  studentProfileId: string | null;
  studentNumber: string | null;
  branchInfo: Array<{
    branchId: string;
    branchName: string;
    relation: 'Home' | 'Admission' | 'Enrollment';
  }>;
  preflight: {
    hasActiveAdmission: boolean;
    activeAdmissionId: string | null;
    hasEnrollment: boolean;
    conflictCode: string | null;
  } | null;
};

// Extend CreateLeadSchema to include editing properties and conditional lost validations
const leadFormSchema = CreateLeadSchema.extend({
  id: z.string().uuid().optional(),
  version: z.number().int().optional(),
  stage: z.enum(['New', 'Contacted', 'FollowUp', 'Qualified', 'Negotiation', 'Won', 'Lost', 'Converted']).default('New'),
  lostReasonCode: z.string().optional().nullable().or(z.literal('')),
  lostReasonNotes: z.string().optional().nullable().or(z.literal('')),
  bypassDuplicateBlock: z.boolean().optional(),
}).refine((data) => {
  if (data.stage === 'Lost') {
    return !!data.lostReasonCode && data.lostReasonCode.trim() !== '';
  }
  return true;
}, {
  message: 'Lost reason code is required when stage is Lost',
  path: ['lostReasonCode'],
}).refine((data) => {
  if (data.stage === 'Lost') {
    return !!data.lostReasonNotes && data.lostReasonNotes.trim().length >= 15;
  }
  return true;
}, {
  message: 'Lost reason notes must be at least 15 characters',
  path: ['lostReasonNotes'],
});

export type LeadFormData = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
  initialData?: Partial<LeadFormData>;
  branches: Array<{ id: string; name: string }>;
  counselors: Array<{ id: string; name: string }>;
  courses: Array<{ id: string; name: string }>;
  onSubmitAction: (data: any) => Promise<any>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function LeadForm({
  initialData,
  branches,
  counselors,
  courses,
  onSubmitAction,
  onSuccess,
  onCancel,
}: LeadFormProps) {
  const router = useRouter();
  const [errorState, setErrorState] = useState<string | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [studentLookup, setStudentLookup] = useState<StudentLookupResult | null>(null);
  const [studentLookupLoading, setStudentLookupLoading] = useState(false);

  const defaultValues: any = {
    id: initialData?.id,
    version: initialData?.version,
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    dateOfBirth: (() => {
      if (!initialData?.dateOfBirth) return '';
      const d = new Date(initialData.dateOfBirth);
      return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
    })(),
    branchId: initialData?.branchId || '',
    interestedCourseId: initialData?.interestedCourseId || '',
    counselorId: initialData?.counselorId || '',
    source: initialData?.source || 'Other',
    notes: initialData?.notes || '',
    stage: initialData?.stage || 'New',
    lostReasonCode: initialData?.lostReasonCode || '',
    lostReasonNotes: initialData?.lostReasonNotes || '',
    bypassDuplicateBlock: false,
  };

  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors: rawErrors, isSubmitting },
  } = useForm<any>({
    resolver: zodResolver(leadFormSchema),
    defaultValues,
  });

  const errors = rawErrors as any;

  const selectedStage = watch('stage');
  const isBypassChecked = watch('bypassDuplicateBlock');
  const watchedEmail = watch('email');
  const watchedPhone = watch('phone');
  const leadSourceOptions = [
    { value: 'WalkIn', label: 'Walk-In' },
    { value: 'Web', label: 'Website' },
    { value: 'Campaign', label: 'Campaign' },
    { value: 'Referral', label: 'Referral' },
    { value: 'Phone', label: 'Phone' },
    { value: 'WhatsApp', label: 'WhatsApp' },
    { value: 'Facebook', label: 'Facebook' },
    { value: 'Instagram', label: 'Instagram' },
    { value: 'GoogleAds', label: 'Google Ads' },
    { value: 'CorporateReferral', label: 'Corporate Referral' },
    { value: 'Other', label: 'Other' },
  ].filter((option) => LeadSourceEnum.options.includes(option.value as any));

  useEffect(() => {
    const email = typeof watchedEmail === 'string' ? watchedEmail.trim() : '';
    const mobile = typeof watchedPhone === 'string' ? watchedPhone.trim() : '';

    if (!email && !mobile) {
      setStudentLookup(null);
      setStudentLookupLoading(false);
      return;
    }

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validMobile = mobile.length >= 7;

    if (!validEmail && !validMobile) {
      setStudentLookup(null);
      setStudentLookupLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setStudentLookupLoading(true);

      try {
        const params = new URLSearchParams();
        if (validEmail) params.set('email', email);
        if (validMobile) params.set('mobile', mobile);

        const res = await fetch(`/api/v1/crm/leads/student-lookup?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.messageEnglish || 'Unable to check for an existing student.');
        }

        const nextLookup = data.data as StudentLookupResult;
        setStudentLookup(nextLookup.studentProfileId ? nextLookup : null);
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          setStudentLookup(null);
        }
      } finally {
        setStudentLookupLoading(false);
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [watchedEmail, watchedPhone]);

  const onSubmit = async (values: any) => {
    setErrorState(null);
    try {
      const payload = {
        ...values,
        dateOfBirth: values.dateOfBirth instanceof Date
          ? values.dateOfBirth.toISOString().split('T')[0]
          : values.dateOfBirth,
      };

      const response = await onSubmitAction(payload);
      if (response && !response.success) {
        if (response.status === 'VALIDATION_ERROR' && response.fieldErrors) {
          Object.entries(response.fieldErrors).forEach(([field, messages]) => {
            const msgList = messages as string[];
            setError(field as any, {
              type: 'server',
              message: msgList[0],
            });
          });
        } else if (
          response.status === 'DUPLICATE_LEAD_DETECTED' ||
          response.errorCode === 'ERR_CRM_DUPLICATE_LEAD_DETECTED' ||
          response.error === 'ERR_CRM_DUPLICATE_LEAD_DETECTED'
        ) {
          setShowDuplicateWarning(true);
        } else {
          setErrorState(response.error || response.messageEnglish || 'Submission failed');
        }
      } else {
        toast.success(initialData?.id ? 'Lead updated successfully!' : 'Lead created successfully!');
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/leads');
          router.refresh();
        }
      }
    } catch (e: any) {
      setErrorState(e.message || 'An unexpected error occurred.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5 lg:space-y-6">
      {initialData?.id && (
        <>
          <input type="hidden" {...register('id')} />
          <input type="hidden" {...register('version')} />
        </>
      )}
      {errorState && (
        <Alert variant="error" title="Submission Error" description={errorState} />
      )}

      {showDuplicateWarning && (
        <Alert variant="warning" title="Active Duplicate Lead Detected">
          <p className="mb-3 text-sm">
            An active lead with this phone number or email address was already created in this branch within the last 30 days.
          </p>
          <div className="flex items-center gap-2 mt-2 border-t border-[color:var(--ims-warning-border)] pt-2">
            <input
              id="bypassDuplicateBlock"
              type="checkbox"
              className="rounded border-[color:var(--ims-border)] text-[color:var(--ims-warning)] focus:ring-[color:var(--ims-warning)] h-4 w-4"
              {...register('bypassDuplicateBlock')}
            />
            <label htmlFor="bypassDuplicateBlock" className="text-xs font-semibold select-none cursor-pointer">
              Ignore duplicate warning and proceed (forced override)
            </label>
          </div>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {/* Left Column: Personal Info */}
        <div className="space-y-4 sm:space-y-5">
          {/* Card 1: Personal Information */}
          <div className="space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Personal Information</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField>
                <FormLabel required>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter first name" {...register('firstName')} />
                </FormControl>
                <FormError>{errors.firstName?.message}</FormError>
              </FormField>

              <FormField>
                <FormLabel required>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter last name" {...register('lastName')} />
                </FormControl>
                <FormError>{errors.lastName?.message}</FormError>
              </FormField>
            </div>

            <FormField>
              <FormLabel required>Phone Number (Omani or International)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. 91234567" {...register('phone')} />
              </FormControl>
              <FormError>{errors.phone?.message}</FormError>
            </FormField>

            <FormField>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="e.g. student@example.com" {...register('email')} />
              </FormControl>
              <FormError>{errors.email?.message}</FormError>
            </FormField>

          <FormField>
            <FormLabel>Date of Birth</FormLabel>
            <FormControl>
              <Input
                type="date"
                  {...register('dateOfBirth', {
                    setValueAs: (v) => (v === '' ? null : v),
                  })}
                />
            </FormControl>
            <FormError>{errors.dateOfBirth?.message}</FormError>
          </FormField>

          <div className="space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Notes</h3>
              </div>
            </div>

            <FormField>
              <FormControl>
                <Textarea placeholder="Lead background context, course interest detail..." rows={5} {...register('notes')} />
              </FormControl>
              <FormError>{errors.notes?.message}</FormError>
            </FormField>
          </div>
          </div>

          {studentLookupLoading && (
            <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-4 text-sm text-[color:var(--ims-muted)]">
              <Loader2 className="h-4 w-4 animate-spin text-[color:var(--ims-brass)]" />
              Checking whether this contact already belongs to a student...
            </div>
          )}

        </div>

        {/* Right Column: Interest, Assignment & Stage Status */}
        <div className="space-y-4 sm:space-y-5">
          {/* Card 2: Assignment & Interest */}
          <div className="space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Lead Assignment & Interest</h3>
              </div>
            </div>

            <FormField>
              <FormLabel required>Branch</FormLabel>
              <Controller
                name="branchId"
                control={control}
                render={({ field }) => (
                  <Select
                    placeholder="Select branch"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    options={branches.map((b) => ({ value: b.id, label: b.name }))}
                  />
                )}
              />
              <FormError>{errors.branchId?.message}</FormError>
            </FormField>

            <FormField>
              <FormLabel required>Interested Course</FormLabel>
              <Controller
                name="interestedCourseId"
                control={control}
                render={({ field }) => (
                  <Select
                    placeholder="Select course"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    options={courses.map((c) => ({ value: c.id, label: c.name }))}
                  />
                )}
              />
              <FormError>{errors.interestedCourseId?.message}</FormError>
            </FormField>

            <FormField>
              <FormLabel>Assigned Counselor</FormLabel>
              <Controller
                name="counselorId"
                control={control}
                render={({ field }) => (
                  <Select
                    placeholder="Select counselor"
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    options={[
                      { value: '', label: 'Unassigned' },
                      ...counselors.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                  />
                )}
              />
              <FormError>{errors.counselorId?.message}</FormError>
            </FormField>

            <FormField>
              <FormLabel>Lead Source</FormLabel>
              <Controller
                name="source"
                control={control}
                render={({ field }) => (
                  <Select
                    placeholder="Select source"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    options={leadSourceOptions}
                  />
                )}
              />
              <FormError>{errors.source?.message}</FormError>
            </FormField>
          </div>

          {/* Card 4: Pipeline Status (Only on Edit) */}
          {initialData?.id && (
            <div className="space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
                <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Pipeline Stage</h3>
                </div>
              </div>

              <FormField>
                <FormLabel required>Pipeline Stage</FormLabel>
                <Controller
                  name="stage"
                  control={control}
                  render={({ field }) => (
                    <Select
                      placeholder="Select stage"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      options={[
                        { value: 'New', label: 'New' },
                        { value: 'Contacted', label: 'Contacted' },
                        { value: 'FollowUp', label: 'FollowUp' },
                        { value: 'Qualified', label: 'Qualified' },
                        { value: 'Negotiation', label: 'Negotiation' },
                        { value: 'Won', label: 'Won' },
                        { value: 'Lost', label: 'Lost' },
                        { value: 'Converted', label: 'Converted (System only)', disabled: true },
                      ]}
                    />
                  )}
                />
                <FormError>{errors.stage?.message}</FormError>
              </FormField>

              {/* Lost Fields - conditionally rendered when stage is Lost */}
              {selectedStage === 'Lost' && (
                <div className="border border-[color:var(--ims-error-border)] bg-red-50/20 p-4 rounded-xl space-y-4">
                  <h4 className="text-xs font-bold text-[color:var(--ims-error)] uppercase tracking-wide">
                    Pipeline Closure: Mark Lost
                  </h4>

                  <FormField>
                    <FormLabel required>Lost Reason Code</FormLabel>
                    <Controller
                      name="lostReasonCode"
                      control={control}
                      render={({ field }) => (
                        <Select
                          placeholder="Select lost reason"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value)}
                          options={[
                            { value: 'PriceTooHigh', label: 'Price too high' },
                            { value: 'CompetitorChosen', label: 'Chose competitor' },
                            { value: 'TimingNotGood', label: 'Timing not good' },
                            { value: 'NoResponse', label: 'Lost contact / no response' },
                            { value: 'Other', label: 'Other reason' },
                          ]}
                        />
                      )}
                    />
                    <FormError>{errors.lostReasonCode?.message}</FormError>
                  </FormField>

                  <FormField>
                    <FormLabel required>Lost Reason Details (Min 15 characters)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe lost reason in details..."
                        rows={3}
                        {...register('lostReasonNotes')}
                      />
                    </FormControl>
                    <FormError>{errors.lostReasonNotes?.message}</FormError>
                  </FormField>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {studentLookup && (
        <div className="rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-4 shadow-sm sm:p-5 lg:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--ims-accent-soft)] text-[color:var(--ims-brass)]">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ims-muted)]">
                  Existing student found
                </p>
                <h3 className="text-lg font-semibold text-[color:var(--ims-ink)]">
                  {studentLookup.firstNameMasked} {studentLookup.lastNameMasked}
                </h3>
                <p className="text-sm text-[color:var(--ims-muted)]">
                  This contact already has a student profile. Review the record before creating a new lead.
                </p>
              </div>
            </div>
            {studentLookup.studentNumber && (
              <div className="rounded-xl border border-[color:var(--ims-border)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--ims-ink)]">
                Student #{studentLookup.studentNumber}
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[color:var(--ims-border)] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">Email</p>
              <p className="mt-1 text-sm text-[color:var(--ims-ink)]">{studentLookup.maskedEmail || 'N/A'}</p>
            </div>
            <div className="rounded-xl border border-[color:var(--ims-border)] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">Mobile</p>
              <p className="mt-1 text-sm text-[color:var(--ims-ink)]">{studentLookup.maskedMobile || 'N/A'}</p>
            </div>
            <div className="rounded-xl border border-[color:var(--ims-border)] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">Active Admission</p>
              <p className="mt-1 text-sm text-[color:var(--ims-ink)]">
                {studentLookup.preflight?.hasActiveAdmission ? 'Yes' : 'No'}
              </p>
            </div>
            <div className="rounded-xl border border-[color:var(--ims-border)] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">Enrollment</p>
              <p className="mt-1 text-sm text-[color:var(--ims-ink)]">
                {studentLookup.preflight?.hasEnrollment ? 'Existing enrollment' : 'No enrollment'}
              </p>
            </div>
          </div>

          {studentLookup.branchInfo.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
                Branch information
              </p>
              <div className="flex flex-wrap gap-2">
                {studentLookup.branchInfo.map((branch) => (
                  <div key={`${branch.branchId}-${branch.relation}`} className="inline-flex items-center gap-2 rounded-full border border-[color:var(--ims-border)] bg-white px-3 py-1.5 text-sm text-[color:var(--ims-ink)]">
                    <span className="font-medium">{branch.branchName}</span>
                    <span className="rounded-full bg-[color:var(--ims-accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ims-brass)]">
                      {branch.relation}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-[color:var(--ims-border)] pt-4 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || (showDuplicateWarning && !isBypassChecked)}>
          {isSubmitting ? 'Saving...' : 'Save Lead'}
        </Button>
      </div>
    </form>
  );
}
