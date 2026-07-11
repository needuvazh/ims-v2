'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Button,
  Input,
  Select,
  FormField,
  FormLabel,
  FormControl,
  FormError,
  Badge,
  ResponsiveDataTable,
  EmptyState,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from '@ims/shared-ui';
import {
  Plus,
  RefreshCw,
  Landmark,
  X,
  FileText,
  Trash2,
  Edit2,
  Calendar,
} from 'lucide-react';

interface CourseExamsConfigTabProps {
  courseId: string;
}

const examFormSchema = z.object({
  examName: z
    .string()
    .trim()
    .min(3, 'Exam name must be at least 3 characters')
    .max(200, 'Exam name must be at most 200 characters'),
  maxMarks: z.coerce
    .number()
    .positive('Max marks must be greater than 0'),
  passMarks: z.coerce
    .number()
    .nonnegative('Pass marks must be >= 0'),
  status: z.enum(['Active', 'Inactive']),
}).refine(data => data.passMarks <= data.maxMarks, {
  message: 'Passing marks cannot exceed maximum marks',
  path: ['passMarks'],
});

type ExamFormValues = z.infer<typeof examFormSchema>;

export function CourseExamsConfigTab({ courseId }: CourseExamsConfigTabProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerType, setDrawerType] = useState<'create' | 'edit' | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<any | null>(null);

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examFormSchema),
    defaultValues: {
      examName: '',
      maxMarks: 100,
      passMarks: 50,
      status: 'Active',
    },
  });

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/courses/${courseId}/exam-templates`);
      if (res.ok) {
        const json = await res.json();
        setTemplates(json.data || []);
      } else {
        toast.error('Failed to load exam templates.');
      }
    } catch {
      toast.error('Failed to load exam templates.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openCreateDrawer = () => {
    setActiveTemplate(null);
    form.reset({
      examName: '',
      maxMarks: 100,
      passMarks: 50,
      status: 'Active',
    });
    setDrawerType('create');
  };

  const openEditDrawer = (template: any) => {
    setActiveTemplate(template);
    form.reset({
      examName: template.examName,
      maxMarks: Number(template.maxMarks),
      passMarks: Number(template.passMarks),
      status: template.status as 'Active' | 'Inactive',
    });
    setDrawerType('edit');
  };

  const closeDrawer = () => {
    setDrawerType(null);
    setActiveTemplate(null);
    form.reset();
  };

  const handleSubmit = async (values: ExamFormValues) => {
    try {
      const isEdit = drawerType === 'edit';
      const url = isEdit
        ? `/api/v1/courses/${courseId}/exam-templates/${activeTemplate.id}`
        : `/api/v1/courses/${courseId}/exam-templates`;

      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.messageEnglish || json.error || `Failed to ${drawerType} exam template.`);
      } else {
        toast.success(`Exam template ${isEdit ? 'updated' : 'created'} successfully!`);
        closeDrawer();
        fetchTemplates();
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.');
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this exam template?')) return;

    try {
      const res = await fetch(`/api/v1/courses/${courseId}/exam-templates/${templateId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.messageEnglish || json.error || 'Failed to delete exam template.');
      } else {
        toast.success('Exam template deleted successfully!');
        fetchTemplates();
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.');
    }
  };

  const columns = [
    {
      header: 'Exam Name',
      render: (template: any) => (
        <span className="font-semibold text-slate-800">{template.examName}</span>
      ),
    },
    {
      header: 'Max Marks',
      render: (template: any) => (
        <span className="font-mono text-slate-700">{Number(template.maxMarks)}</span>
      ),
    },
    {
      header: 'Passing Marks',
      render: (template: any) => (
        <span className="font-mono text-slate-700">{Number(template.passMarks)}</span>
      ),
    },
    {
      header: 'Status',
      render: (template: any) => {
        const val = template.status;
        return val === 'Active' ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="outline">Inactive</Badge>
        );
      },
    },
    {
      header: 'Actions',
      render: (template: any) => (
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openEditDrawer(template)}
            className="flex items-center gap-1 text-slate-700 hover:text-slate-900"
          >
            <Edit2 className="h-3 w-3" /> Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleDelete(template.id)}
            className="flex items-center gap-1 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </Button>
        </div>
      ),
      headerClassName: 'text-right',
    },
  ];

  const renderCard = (template: any) => (
    <Card key={template.id} className="p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold text-slate-800">{template.examName}</h4>
          <div className="flex gap-4 text-xs text-slate-500 mt-1">
            <span>Max: {Number(template.maxMarks)}</span>
            <span>Pass: {Number(template.passMarks)}</span>
          </div>
        </div>
        {template.status === 'Active' ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="outline">Inactive</Badge>
        )}
      </div>
      <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
        <Button
          size="sm"
          variant="outline"
          onClick={() => openEditDrawer(template)}
          className="flex items-center gap-1 text-slate-700 hover:text-slate-900"
        >
          <Edit2 className="h-3 w-3" /> Edit
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleDelete(template.id)}
          className="flex items-center gap-1 text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-3 w-3" /> Delete
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            Course Exam Masters
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure default exam thresholds for batches cohort inheritance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={openCreateDrawer}
            variant="primary"
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> Add Master Exam
          </Button>
          <Button
            onClick={fetchTemplates}
            disabled={loading}
            variant="outline"
            className="p-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading && templates.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-sm">
          Loading exam templates...
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          title="No Master Exams Configured"
          description="Define standard exams for this course catalog template. Scheduled batches will inherit these structures."
          icon={<FileText className="h-10 w-10 text-slate-400" />}
          action={
            <Button onClick={openCreateDrawer} variant="outline" className="mt-2">
              Add First Master
            </Button>
          }
        />
      ) : (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <ResponsiveDataTable
            columns={columns}
            data={templates}
            keyExtractor={(t) => t.id}
            renderCard={renderCard}
          />
        </div>
      )}

      {/* ─── SIDE DRAWER PANEL ─── */}
      {drawerType && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={closeDrawer}
          />

          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-white border-l border-slate-200 shadow-2xl overflow-y-auto transform transition-transform duration-300 ease-in-out translate-x-0">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[color:var(--ims-brand)]" />
                  {drawerType === 'create' ? 'Add Exam Master Template' : 'Edit Exam Master Template'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define academic evaluation standard settings.
                </p>
              </div>
              <button
                onClick={closeDrawer}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200/50 rounded-full transition-all text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6">
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField>
                  <FormLabel required>Exam Name</FormLabel>
                  <FormControl>
                    <Input
                      {...form.register('examName')}
                      placeholder="e.g. Mid-Term Written Assessment"
                      disabled={form.formState.isSubmitting}
                    />
                  </FormControl>
                  {form.formState.errors.examName && (
                    <FormError>{form.formState.errors.examName.message}</FormError>
                  )}
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField>
                    <FormLabel required>Maximum Marks</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...form.register('maxMarks')}
                        placeholder="100"
                        disabled={form.formState.isSubmitting}
                      />
                    </FormControl>
                    {form.formState.errors.maxMarks && (
                      <FormError>{form.formState.errors.maxMarks.message}</FormError>
                    )}
                  </FormField>

                  <FormField>
                    <FormLabel required>Passing Marks</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...form.register('passMarks')}
                        placeholder="50"
                        disabled={form.formState.isSubmitting}
                      />
                    </FormControl>
                    {form.formState.errors.passMarks && (
                      <FormError>{form.formState.errors.passMarks.message}</FormError>
                    )}
                  </FormField>
                </div>

                <FormField>
                  <FormLabel required>Status</FormLabel>
                  <FormControl>
                    <Controller
                      name="status"
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          options={[
                            { value: 'Active', label: 'Active (Inheritable)' },
                            { value: 'Inactive', label: 'Inactive' },
                          ]}
                          disabled={form.formState.isSubmitting}
                        />
                      )}
                    />
                  </FormControl>
                  {form.formState.errors.status && (
                    <FormError>{form.formState.errors.status.message}</FormError>
                  )}
                </FormField>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDrawer}
                    disabled={form.formState.isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
