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
  Sliders,
  Loader2,
  UserCheck,
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
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [batchCode, setBatchCode] = useState(initialData?.batchCode || '');
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
  const [waitingListEnabled, setWaitingListEnabled] = useState(
    initialData?.waitingListEnabled ?? true,
  );
  const [allowOverbooking, setAllowOverbooking] = useState(
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

  // Step 1 Validation
  const isStep1Valid =
    batchCode.trim().length >= 3 &&
    batchNameEnglish.trim().length >= 3 &&
    courseId &&
    branchId &&
    startDate &&
    endDate;

  const handleCourseChange = (selectedCourseId: string) => {
    setCourseId(selectedCourseId);
    if (!initialData && selectedCourseId) {
      const course = courses.find((c) => c.id === selectedCourseId);
      const prefix = course ? course.courseCode.toUpperCase() : 'B';
      const cleanPrefix = prefix.replace(/[^A-Z0-9-]/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const truncatedPrefix = cleanPrefix.substring(0, 15);
      setBatchCode(`${truncatedPrefix}-${randomSuffix}`);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!isStep1Valid) {
        setErrorMsg('Please fill in all required fields in Step 1.');
        return;
      }
      setErrorMsg(null);
      setStep(2);
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (step === 2) {
      setStep(1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 2) return;

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await onSubmitAction({
        courseId,
        branchId,
        classroomId: null,
        batchCode: batchCode.trim().toUpperCase(),
        batchNameEnglish: batchNameEnglish.trim(),
        batchNameArabic: (initialData?.batchNameArabic || batchNameEnglish).trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        capacity: parseInt(capacity, 10),
        waitingListEnabled,
        allowOverbooking,
        isWalkIn,
        corporateAccountId: corporateAccountId || null,
        ...(initialData ? {} : { primaryTrainerId: null }),
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

      {/* Stepper Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                step === 1
                  ? 'bg-indigo-600 text-white'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {step > 1 ? '✓' : '1'}
            </span>
            <span
              className={`text-sm font-semibold ${step === 1 ? 'text-slate-800' : 'text-slate-400'}`}
            >
              Details & Dates
            </span>
          </div>
          <div className="w-12 h-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                step === 2
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              2
            </span>
            <span
              className={`text-sm font-semibold ${step === 2 ? 'text-slate-800' : 'text-slate-400'}`}
            >
              Capacity & Controls
            </span>
          </div>
        </div>
        <div className="text-xs font-medium text-slate-400">
          Step {step} of 2
        </div>
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          {/* Card 1: Identification & Mapping */}
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
                  Provide code, bilingual titles, and course association
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField>
                <FormLabel>Batch Code</FormLabel>
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-mono select-none text-sm h-10 flex items-center">
                  {batchCode || 'Generated upon course selection'}
                </div>
              </FormField>

              <FormField>
                <FormLabel required>Parent Course</FormLabel>
                <FormControl>
                  <Select
                    placeholder="Select Course"
                    value={courseId}
                    onChange={(e) => handleCourseChange(e.target.value)}
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
          </div>

          {/* Card 2: Scheduling Dates */}
          <div className="flex flex-col justify-between space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6">
            <div className="space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">
                    Timeline & Scheduling
                  </h3>
                  <p className="text-xs text-slate-500">
                    Define batch start date, end date, and normalizations
                  </p>
                </div>
              </div>

              <div className="space-y-4">
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
            </div>

            <div className="flex justify-end pt-4 sm:pt-6">
              <Button
                type="button"
                onClick={handleNext}
                disabled={!isStep1Valid}
              >
                Next: Capacity & Controls
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          {/* Card 1: Capacity & Corporate settings */}
          <div className="space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">
                  Capacity & Student Controls
                </h3>
                <p className="text-xs text-slate-500">
                  Define maximum enrollments and B2B client overrides
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <div className="space-y-4 pt-4">
              {/* Commented out for Phase 1 as requested by user
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <input
                  id="waitingListEnabled"
                  type="checkbox"
                  checked={waitingListEnabled}
                  onChange={(e) => setWaitingListEnabled(e.target.checked)}
                  className="h-4.5 w-4.5 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <label
                    htmlFor="waitingListEnabled"
                    className="text-sm font-semibold text-slate-800 block cursor-pointer"
                  >
                    Enable Waiting List Queue
                  </label>
                  <span className="text-xs text-slate-500">
                    Automatically redirect enrollments to waiting list queue
                    when capacity limit is reached.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <input
                  id="allowOverbooking"
                  type="checkbox"
                  checked={allowOverbooking}
                  onChange={(e) => setAllowOverbooking(e.target.checked)}
                  className="h-4.5 w-4.5 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <label
                    htmlFor="allowOverbooking"
                    className="text-sm font-semibold text-slate-800 block cursor-pointer"
                  >
                    Allow Overbooking limits
                  </label>
                  <span className="text-xs text-slate-500">
                    Bypass standard batch capacity limits for corporate or
                    prioritized bookings.
                  </span>
                </div>
              </div>
              */}

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

          {/* Card 2: Summary / Guidelines */}
          <div className="flex flex-col justify-between space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6">
            <div className="space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">
                    Review Parameters
                  </h3>
                  <p className="text-xs text-slate-500">
                    Check configured options before proceeding
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-600 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between pb-2 border-b border-slate-200/50">
                  <span className="font-medium">Batch Code:</span>
                  <span className="font-mono text-slate-800 uppercase">
                    {batchCode || 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200/50">
                  <span className="font-medium">English Name:</span>
                  <span className="text-slate-800">
                    {batchNameEnglish || 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200/50">
                  <span className="font-medium">Dates Scope:</span>
                  <span className="text-slate-800">
                    {startDate ? `${startDate} to ${endDate}` : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Capacity Limit:</span>
                  <span className="text-slate-800 font-bold">
                    {capacity} seats
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="w-full sm:w-auto"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
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
      )}
    </form>
  );
}
