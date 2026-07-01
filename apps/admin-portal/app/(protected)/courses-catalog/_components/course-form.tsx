'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateCourseSchema, UpdateCourseSchema } from '@ims/course-catalog';
import {
  Input,
  Select,
  FormField,
  FormLabel,
  FormControl,
  FormError,
  Button,
  Alert,
} from '@ims/shared-ui';
import {
  BookOpen,
  Layers,
  Calendar,
  Loader2,
} from 'lucide-react';

interface CourseFormProps {
  initialData?: any;
  categories: any[];
  departments: any[];
  onSubmitAction: (data: any) => Promise<any>;
}

export function CourseForm({
  initialData,
  categories,
  departments,
  onSubmitAction,
}: CourseFormProps) {
  const router = useRouter();
  const [errorState, setErrorState] = useState<string | null>(null);

  const isEditMode = !!initialData?.id;

  const defaultValues = {
    courseCode: initialData?.courseCode || '',
    nameEnglish: initialData?.nameEnglish || '',
    nameArabic: initialData?.nameArabic || '',
    descriptionEnglish: initialData?.descriptionEnglish || '',
    descriptionArabic: initialData?.descriptionArabic || '',
    departmentId: initialData?.departmentId || '',
    categoryId: initialData?.categoryId || '',
    courseClassification: initialData?.courseClassification || 'Regular',
    durationType: initialData?.durationType || 'Weeks',
    durationValue: initialData?.durationValue || 12,
    allowWalkInCompletion: !!initialData?.allowWalkInCompletion,
    effectiveStartDate: initialData?.effectiveStartDate
      ? new Date(initialData.effectiveStartDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    effectiveEndDate: initialData?.effectiveEndDate
      ? new Date(initialData.effectiveEndDate).toISOString().split('T')[0]
      : '',
  };

  const schema = isEditMode ? UpdateCourseSchema : CreateCourseSchema;

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors: anyErrors, isSubmitting },
  } = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const errors = anyErrors as any;

  const onSubmit = async (values: any) => {
    setErrorState(null);
    try {
      // Map categoryId empty string to null, and map values
      const payload = {
        ...values,
        categoryId: values.categoryId === '' ? null : values.categoryId,
        descriptionEnglish: values.descriptionEnglish || null,
        descriptionArabic: values.descriptionArabic || null,
        effectiveEndDate: values.effectiveEndDate === '' ? null : values.effectiveEndDate,
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
        } else {
          setErrorState(response.error || 'Submission failed. Please check your parameters.');
        }
      } else {
        toast.success(isEditMode ? 'Course updated successfully!' : 'Course created successfully!');
        router.push('/courses-catalog');
        router.refresh();
      }
    } catch (e: any) {
      setErrorState(e.message || 'An unexpected error occurred.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {errorState && (
        <Alert variant="error" title="Submission Error">
          {errorState}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: General Identification Details */}
        <div className="space-y-8">
          <div className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Course Template Details</h3>
                <p className="text-xs text-slate-500">General info, department scope, and bilingual content</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField>
                <FormLabel required>Course Code (unique uppercase)</FormLabel>
                <FormControl>
                  <Input
                    {...register('courseCode')}
                    placeholder="e.g. CS-FSWD"
                    disabled={isEditMode}
                    className="font-mono uppercase"
                  />
                </FormControl>
                {errors.courseCode && <FormError>{errors.courseCode.message}</FormError>}
              </FormField>

              <FormField>
                <FormLabel required>Department Scope</FormLabel>
                <FormControl>
                  <Controller
                    name="departmentId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        placeholder="Select department"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        options={departments.map((d) => ({ value: d.id, label: d.departmentName }))}
                      />
                    )}
                  />
                </FormControl>
                {errors.departmentId && <FormError>{errors.departmentId.message}</FormError>}
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField>
                <FormLabel required>Course Title (English)</FormLabel>
                <FormControl>
                  <Input {...register('nameEnglish')} placeholder="e.g. Full Stack Web Development" />
                </FormControl>
                {errors.nameEnglish && <FormError>{errors.nameEnglish.message}</FormError>}
              </FormField>

              <FormField>
                <FormLabel required>Course Title (Arabic)</FormLabel>
                <FormControl>
                  <Input
                    {...register('nameArabic')}
                    placeholder="e.g. تطوير تطبيقات الويب"
                    className="text-right font-arabic"
                    dir="rtl"
                  />
                </FormControl>
                {errors.nameArabic && <FormError>{errors.nameArabic.message}</FormError>}
              </FormField>
            </div>

            <FormField>
              <FormLabel>Description (English)</FormLabel>
              <FormControl>
                <textarea
                  {...register('descriptionEnglish')}
                  placeholder="Provide a detailed description of the course in English..."
                  rows={4}
                  className="w-full rounded-xl border border-[color:var(--ims-border)] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
                />
              </FormControl>
              {errors.descriptionEnglish && <FormError>{errors.descriptionEnglish.message}</FormError>}
            </FormField>

            <FormField>
              <FormLabel>Description (Arabic)</FormLabel>
              <FormControl>
                <textarea
                  {...register('descriptionArabic')}
                  placeholder="Provide a detailed description of the course in Arabic..."
                  rows={4}
                  className="w-full rounded-xl border border-[color:var(--ims-border)] p-3 text-sm text-right font-arabic focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
                  dir="rtl"
                />
              </FormControl>
              {errors.descriptionArabic && <FormError>{errors.descriptionArabic.message}</FormError>}
            </FormField>
          </div>
        </div>

        {/* Right Column: Taxonomy, Durations, and Validity */}
        <div className="space-y-8">
          {/* Card 2: Classification and Taxonomy */}
          <div className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Classification & Taxonomy</h3>
                <p className="text-xs text-slate-500">Assign category taxonomy and duration types</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField>
                <FormLabel>Category Taxonomy</FormLabel>
                <FormControl>
                  <Controller
                    name="categoryId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        placeholder="Select category (Optional)"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        options={categories.map((c) => ({ value: c.id, label: `${c.nameEnglish} / ${c.nameArabic}` }))}
                      />
                    )}
                  />
                </FormControl>
                {errors.categoryId && <FormError>{errors.categoryId.message}</FormError>}
              </FormField>

              <FormField>
                <FormLabel required>Course Classification</FormLabel>
                <FormControl>
                  <Controller
                    name="courseClassification"
                    control={control}
                    render={({ field }) => (
                      <Select
                        placeholder="Select classification"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        options={[
                          { value: 'Regular', label: 'Regular (Open Batches)' },
                          { value: 'Corporate', label: 'Corporate (Contract Programs)' },
                        ]}
                      />
                    )}
                  />
                </FormControl>
                {errors.courseClassification && <FormError>{errors.courseClassification.message}</FormError>}
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField>
                <FormLabel required>Duration Type</FormLabel>
                <FormControl>
                  <Controller
                    name="durationType"
                    control={control}
                    render={({ field }) => (
                      <Select
                        placeholder="Select duration type"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        options={[
                          { value: 'Hours', label: 'Hours' },
                          { value: 'Days', label: 'Days' },
                          { value: 'Weeks', label: 'Weeks' },
                          { value: 'Months', label: 'Months' },
                        ]}
                      />
                    )}
                  />
                </FormControl>
                {errors.durationType && <FormError>{errors.durationType.message}</FormError>}
              </FormField>

              <FormField>
                <FormLabel required>Duration Value</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...register('durationValue', { valueAsNumber: true })}
                    placeholder="e.g. 12"
                  />
                </FormControl>
                {errors.durationValue && <FormError>{errors.durationValue.message}</FormError>}
              </FormField>
            </div>
          </div>

          {/* Card 3: Prerequisites & Validity */}
          <div className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Prerequisites & Validity</h3>
                <p className="text-xs text-slate-500">Configure scheduling limits and date ranges</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField>
                <FormLabel required>Effective Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...register('effectiveStartDate')} />
                </FormControl>
                {errors.effectiveStartDate && <FormError>{errors.effectiveStartDate.message}</FormError>}
              </FormField>

              <FormField>
                <FormLabel>Effective End Date (Optional)</FormLabel>
                <FormControl>
                  <Input type="date" {...register('effectiveEndDate')} />
                </FormControl>
                {errors.effectiveEndDate && <FormError>{errors.effectiveEndDate.message}</FormError>}
              </FormField>
            </div>

            <div className="flex items-center gap-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50 mt-4">
              <Controller
                control={control}
                name="allowWalkInCompletion"
                render={({ field: { value, onChange } }) => (
                  <input
                    type="checkbox"
                    id="allowWalkInCompletion"
                    checked={value}
                    onChange={(e) => onChange(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-5 w-5 cursor-pointer"
                  />
                )}
              />
              <div>
                <label htmlFor="allowWalkInCompletion" className="text-sm font-semibold text-slate-800 select-none cursor-pointer">
                  Allow Walk-In Fast-Track Completion
                </label>
                <p className="text-xs text-slate-500 mt-0.5">Enables immediate same-day completions and certificates bypassing standard timetables</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={() => router.push('/courses-catalog')} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            isEditMode ? 'Update Course Template' : 'Create Course Template'
          )}
        </Button>
      </div>
    </form>
  );
}
