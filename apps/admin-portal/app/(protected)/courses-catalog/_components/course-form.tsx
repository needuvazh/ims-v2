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
  Globe,
  PlusCircle,
  Settings,
  ShieldCheck,
  FileText
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
    isPubliclyExposed: !!initialData?.isPubliclyExposed,
    bannerImage: initialData?.bannerImage || '',
    metaTitle: initialData?.metaTitle || '',
    metaDescription: initialData?.metaDescription || '',
    metaKeywords: initialData?.metaKeywords || '',
    syllabusOutline: initialData?.syllabusOutline || '',
    showPricingPublicly: initialData?.showPricingPublicly !== false,
    hasPracticalInstruction: !!initialData?.hasPracticalInstruction,
    practicalTestingDescription: initialData?.practicalTestingDescription || '',
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
        bannerImage: values.bannerImage || null,
        metaTitle: values.metaTitle || null,
        metaDescription: values.metaDescription || null,
        metaKeywords: values.metaKeywords || null,
        syllabusOutline: values.syllabusOutline || null,
        practicalTestingDescription: values.practicalTestingDescription || null,
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-7xl mx-auto">
      {errorState && (
        <Alert variant="error" title="Submission Error">
          {errorState}
        </Alert>
      )}

      {/* Row 1: Core Settings & Logistics side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Card 1: Core Settings & Taxonomy */}
        <div className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Core Settings & Taxonomy</h3>
              <p className="text-xs text-slate-500">Define course code, owner department, and taxonomy classification</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField>
              <FormLabel required>Course Code (unique uppercase)</FormLabel>
              <FormControl>
                <Input
                  {...register('courseCode')}
                  placeholder="e.g. CS-FSWD"
                  disabled={isEditMode}
                  className="font-mono uppercase tracking-wider"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>

        {/* Card 3: Logistics, Durations & Validity */}
        <div className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Logistics, Durations & Validity</h3>
              <p className="text-xs text-slate-500">Configure validity ranges, duration periods, and completion limits</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* Toggle Switches */}
          <div className="flex items-center justify-between bg-slate-50/50 border border-slate-100 p-4 rounded-xl">
            <div>
              <span className="text-sm font-semibold text-slate-800 block">Allow Walk-In Fast-Track Completion</span>
              <span className="text-[11px] text-slate-500 mt-0.5">Enables same-day completions and certificates bypassing standard timetables.</span>
            </div>
            <Controller
              control={control}
              name="allowWalkInCompletion"
              render={({ field: { value, onChange } }) => (
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => onChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              )}
            />
          </div>
        </div>

      </div>

      {/* Row 2: Bilingual Content Card (English & Arabic Side-by-Side) */}
      <div className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">Bilingual Titles & Descriptions</h3>
            <p className="text-xs text-slate-500">Provide official template content in both English and Arabic script</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* English Column */}
          <div className="space-y-4">
            <FormField>
              <FormLabel required>Course Title (English)</FormLabel>
              <FormControl>
                <Input {...register('nameEnglish')} placeholder="e.g. Full Stack Web Development" />
              </FormControl>
              {errors.nameEnglish && <FormError>{errors.nameEnglish.message}</FormError>}
            </FormField>

            <FormField>
              <FormLabel>Description (English)</FormLabel>
              <FormControl>
                <textarea
                  {...register('descriptionEnglish')}
                  placeholder="Provide a detailed description of the course in English..."
                  rows={4}
                  className="w-full rounded-xl border border-[color:var(--ims-border)] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 focus:bg-white transition-all resize-none"
                />
              </FormControl>
              {errors.descriptionEnglish && <FormError>{errors.descriptionEnglish.message}</FormError>}
            </FormField>
          </div>

          {/* Arabic Column */}
          <div className="space-y-4">
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

            <FormField>
              <FormLabel>Description (Arabic)</FormLabel>
              <FormControl>
                <textarea
                  {...register('descriptionArabic')}
                  placeholder="Provide a detailed description of the course in Arabic..."
                  rows={4}
                  className="w-full rounded-xl border border-[color:var(--ims-border)] p-3 text-sm text-right font-arabic focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 focus:bg-white transition-all resize-none"
                  dir="rtl"
                />
              </FormControl>
              {errors.descriptionArabic && <FormError>{errors.descriptionArabic.message}</FormError>}
            </FormField>
          </div>
        </div>
      </div>

      {/* Row 3: Public Exposition, Practical Details & SEO */}
      <div className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">Public Exposition, Practical Details & SEO</h3>
            <p className="text-xs text-slate-500">Configure visual imagery, toggles for price/practical visibility, syllabus and SEO tags</p>
          </div>
        </div>

        {/* Visibility Toggles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 border border-slate-100 p-4 rounded-xl">
          
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm font-semibold text-slate-800 block">Expose Publicly</span>
              <span className="text-[11px] text-slate-500">Publish this course template to the public directory listings.</span>
            </div>
            <Controller
              control={control}
              name="isPubliclyExposed"
              render={({ field: { value, onChange } }) => (
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => onChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              )}
            />
          </div>

          <div className="flex items-center justify-between gap-4 border-t md:border-t-0 md:border-l border-slate-200/60 pt-4 md:pt-0 md:pl-6">
            <div>
              <span className="text-sm font-semibold text-slate-800 block">Show Pricing Publicly</span>
              <span className="text-[11px] text-slate-500">Allow pricing information to be visible in public listings.</span>
            </div>
            <Controller
              control={control}
              name="showPricingPublicly"
              render={({ field: { value, onChange } }) => (
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => onChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              )}
            />
          </div>

          <div className="flex items-center justify-between gap-4 border-t md:border-t-0 md:border-l border-slate-200/60 pt-4 md:pt-0 md:pl-6">
            <div>
              <span className="text-sm font-semibold text-slate-800 block">Has Practical Instruction</span>
              <span className="text-[11px] text-slate-500">Flag this course as containing practical training and testing.</span>
            </div>
            <Controller
              control={control}
              name="hasPracticalInstruction"
              render={({ field: { value, onChange } }) => (
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => onChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              )}
            />
          </div>
        </div>

        {/* Image & General SEO Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <FormField>
              <FormLabel>Course Banner Image URL</FormLabel>
              <FormControl>
                <Input
                  {...register('bannerImage')}
                  placeholder="e.g. /images/courses/web-dev-banner.jpg"
                />
              </FormControl>
              {errors.bannerImage && <FormError>{errors.bannerImage.message}</FormError>}
            </FormField>
          </div>

          <div className="lg:col-span-1">
            <FormField>
              <FormLabel>SEO Meta Title</FormLabel>
              <FormControl>
                <Input {...register('metaTitle')} placeholder="e.g. Learn Full Stack Web Development | ASTI" />
              </FormControl>
              {errors.metaTitle && <FormError>{errors.metaTitle.message}</FormError>}
            </FormField>
          </div>

          <div className="lg:col-span-1">
            <FormField>
              <FormLabel>SEO Meta Keywords</FormLabel>
              <FormControl>
                <Input {...register('metaKeywords')} placeholder="e.g. programming, coding, nextjs" />
              </FormControl>
              {errors.metaKeywords && <FormError>{errors.metaKeywords.message}</FormError>}
            </FormField>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FormField>
            <FormLabel>SEO Meta Description</FormLabel>
            <FormControl>
              <textarea
                {...register('metaDescription')}
                placeholder="Meta description for search engines snippet..."
                rows={2}
                className="w-full rounded-xl border border-[color:var(--ims-border)] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 focus:bg-white transition-all resize-none"
              />
            </FormControl>
            {errors.metaDescription && <FormError>{errors.metaDescription.message}</FormError>}
          </FormField>

          <FormField>
            <FormLabel>Practical Testing Description</FormLabel>
            <FormControl>
              <textarea
                {...register('practicalTestingDescription')}
                placeholder="Describe practical exams, lab scoring, or field tests..."
                rows={2}
                className="w-full rounded-xl border border-[color:var(--ims-border)] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 focus:bg-white transition-all resize-none"
              />
            </FormControl>
            {errors.practicalTestingDescription && <FormError>{errors.practicalTestingDescription.message}</FormError>}
          </FormField>
        </div>

        <FormField>
          <FormLabel>Syllabus Outline (Markdown supported)</FormLabel>
          <FormControl>
            <textarea
              {...register('syllabusOutline')}
              placeholder="### Module 1: Introduction&#10;- HTML/CSS Basics&#10;- Responsive Design principles"
              rows={6}
              className="w-full rounded-xl border border-[color:var(--ims-border)] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 focus:bg-white transition-all resize-none font-mono"
            />
          </FormControl>
          {errors.syllabusOutline && <FormError>{errors.syllabusOutline.message}</FormError>}
        </FormField>
      </div>

      {/* Button Group */}
      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={() => router.push('/courses-catalog')} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving Template...
            </>
          ) : (
            isEditMode ? 'Update Course Template' : 'Create Course Template'
          )}
        </Button>
      </div>

    </form>
  );
}
