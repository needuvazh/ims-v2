'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Input,
  Select,
  FormField,
  FormLabel,
  FormControl,
  Button,
  Alert,
} from '@ims/shared-ui';
import {
  Layers,
  Calendar,
  Loader2,
} from 'lucide-react';

interface BatchFormProps {
  courses: any[];
  branches: any[];
  classrooms: any[];
  trainersList?: any[];
  onSubmitAction: (data: any) => Promise<any>;
  initialData?: any;
  initialTrainerId?: string;
}

export function BatchForm({
  courses,
  branches,
  onSubmitAction,
  initialData,
}: BatchFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [batchCode] = useState(initialData?.batchCode || '');
  const [batchNameEnglish, setBatchNameEnglish] = useState(
    initialData?.batchNameEnglish || '',
  );
  const [courseId, setCourseId] = useState(initialData?.courseId || '');
  const [branchId, setBranchId] = useState(initialData?.branchId || '');
  const [startDate, setStartDate] = useState(
    initialData?.startDate
      ? new Date(initialData.startDate).toISOString().split('T')[0]
      : '',
  );
  const [endDate, setEndDate] = useState(
    initialData?.endDate
      ? new Date(initialData.endDate).toISOString().split('T')[0]
      : '',
  );
  const [capacity, setCapacity] = useState(
    initialData?.capacity?.toString() || '20',
  );
  const [waitingListEnabled] = useState(false);
  const [allowOverbooking] = useState(
    initialData?.allowOverbooking ?? false,
  );
  const [isWalkIn, setIsWalkIn] = useState(initialData?.isWalkIn ?? false);
  const [corporateAccountId, setCorporateAccountId] = useState(
    initialData?.corporateAccountId || '',
  );

  // Tomorrow's date string in YYYY-MM-DD
  const getTomorrowStr = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };
  const tomorrowStr = getTomorrowStr();

  // Unified Form Validation
  const isFormValid =
    batchNameEnglish.trim().length >= 3 &&
    courseId &&
    branchId &&
    startDate &&
    endDate &&
    capacity &&
    parseInt(capacity, 10) > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await onSubmitAction({
        courseId,
        branchId,
        classroomId: null,
        batchNameEnglish: batchNameEnglish.trim(),
        batchNameArabic: (initialData?.batchNameArabic || batchNameEnglish).trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        capacity: parseInt(capacity, 10),
        waitingListEnabled,
        allowOverbooking,
        isWalkIn,
        corporateAccountId: corporateAccountId || null,
        ...(initialData ? { batchCode } : { primaryTrainerId: null }),
      });

      if (!res.success) {
        setErrorMsg(
          res.error ||
            (initialData
              ? 'Failed to update batch.'
              : 'Failed to create batch.'),
        );
        toast.error(
          res.error ||
            (initialData
              ? 'Failed to update batch.'
              : 'Failed to create batch.'),
        );
      } else {
        toast.success(
          initialData
            ? 'Batch updated successfully!'
            : 'Batch created successfully in Draft state!',
        );
        router.push(initialData ? `/batches/${initialData.id}` : '/batches');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
      toast.error(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-4 sm:space-y-5 lg:space-y-6"
    >
      {errorMsg && (
        <Alert variant="error" title="Form Validation Error">
          {errorMsg}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {/* Card 1: Batch Parameters */}
        <div className="space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">
                Batch Parameters
              </h3>
              <p className="text-xs text-slate-500">
                Define the course, branch, name, and capacity limit
              </p>
            </div>
          </div>

          <div>
            <FormField>
              <FormLabel required>Parent Course</FormLabel>
              <FormControl>
                <Select
                  placeholder="Select Course"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  options={courses.map((c) => ({
                    value: c.id,
                    label: `${c.nameEnglish} (${c.courseCode})`,
                  }))}
                />
              </FormControl>
            </FormField>
          </div>

          <div>
            <FormField>
              <FormLabel required>Select Branch</FormLabel>
              <FormControl>
                <Select
                  placeholder="Select Branch"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  options={branches.map((b) => ({
                    value: b.id,
                    label: b.branchName,
                  }))}
                />
              </FormControl>
            </FormField>
          </div>

          <div>
            <FormField>
              <FormLabel required>Batch Name (English)</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. OSHA Safety - Batch 01"
                  value={batchNameEnglish}
                  onChange={(e) => setBatchNameEnglish(e.target.value)}
                />
              </FormControl>
            </FormField>
          </div>

          <div>
            <FormField>
              <FormLabel required>Capacity Limit</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </FormControl>
            </FormField>
          </div>
        </div>

        {/* Card 2: Timeline & Controls */}
        <div className="flex flex-col justify-between space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6">
          <div className="space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">
                  Timeline & Controls
                </h3>
                <p className="text-xs text-slate-500">
                  Define scheduling dates and client association
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField>
                <FormLabel required>Start Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={startDate}
                    min={initialData ? undefined : tomorrowStr}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </FormControl>
              </FormField>

              <FormField>
                <FormLabel required>End Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </FormControl>
              </FormField>
            </div>

            <div>
              <FormField>
                <FormLabel>
                  Corporate Client Account ID (Optional UUID)
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                    value={corporateAccountId}
                    onChange={(e) => setCorporateAccountId(e.target.value)}
                    className="font-mono"
                  />
                </FormControl>
              </FormField>
            </div>

            <div className="pt-2">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <input
                  id="isWalkIn"
                  type="checkbox"
                  checked={isWalkIn}
                  onChange={(e) => setIsWalkIn(e.target.checked)}
                  className="h-4.5 w-4.5 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <label
                    htmlFor="isWalkIn"
                    className="text-sm font-semibold text-slate-800 block cursor-pointer"
                  >
                    Walk-in Program Configuration
                  </label>
                  <span className="text-xs text-slate-500">
                    Designate this batch for rapid same-day completions and
                    fast-track learning journeys.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push(initialData ? `/batches/${initialData.id}` : '/batches')
              }
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting...</span>
                </div>
              ) : initialData ? (
                'Save Changes'
              ) : (
                'Create Batch'
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
