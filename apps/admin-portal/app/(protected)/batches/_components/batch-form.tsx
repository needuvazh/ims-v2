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
  BookOpen,
  Building,
  UserCheck,
} from 'lucide-react';

interface BatchFormProps {
  courses: any[];
  branches: any[];
  classrooms: any[];
  onSubmitAction: (data: any) => Promise<any>;
  initialData?: any;
}

export function BatchForm({ courses, branches, classrooms, onSubmitAction, initialData }: BatchFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [batchCode, setBatchCode] = useState(initialData?.batchCode || '');
  const [batchNameEnglish, setBatchNameEnglish] = useState(initialData?.batchNameEnglish || '');
  const [batchNameArabic, setBatchNameArabic] = useState(initialData?.batchNameArabic || '');
  const [courseId, setCourseId] = useState(initialData?.courseId || '');
  const [branchId, setBranchId] = useState(initialData?.branchId || '');
  const [classroomId, setClassroomId] = useState(initialData?.classroomId || '');
  const [startDate, setStartDate] = useState(initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : '');
  const [endDate, setEndDate] = useState(initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '');
  const [capacity, setCapacity] = useState(initialData?.capacity?.toString() || '20');
  const [waitingListEnabled, setWaitingListEnabled] = useState(initialData?.waitingListEnabled ?? true);
  const [allowOverbooking, setAllowOverbooking] = useState(initialData?.allowOverbooking ?? false);
  const [isWalkIn, setIsWalkIn] = useState(initialData?.isWalkIn ?? false);
  const [corporateAccountId, setCorporateAccountId] = useState(initialData?.corporateAccountId || '');

  // Step 1 Validation
  const isStep1Valid =
    batchCode.trim().length >= 3 &&
    batchNameEnglish.trim().length >= 3 &&
    batchNameArabic.trim().length >= 3 &&
    courseId &&
    branchId &&
    startDate &&
    endDate;

  const handleNext = () => {
    if (!isStep1Valid) {
      setErrorMsg('Please fill in all required fields in Step 1.');
      return;
    }
    setErrorMsg(null);
    setStep(2);
  };

  const handleBack = () => {
    setErrorMsg(null);
    setStep(1);
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
        classroomId: classroomId || null,
        batchCode: batchCode.trim().toUpperCase(),
        batchNameEnglish: batchNameEnglish.trim(),
        batchNameArabic: batchNameArabic.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        capacity: parseInt(capacity, 10),
        waitingListEnabled,
        allowOverbooking,
        isWalkIn,
        corporateAccountId: corporateAccountId || null,
      });

      if (!res.success) {
        setErrorMsg(res.error || (initialData ? 'Failed to update batch.' : 'Failed to create batch.'));
        toast.error(res.error || (initialData ? 'Failed to update batch.' : 'Failed to create batch.'));
      } else {
        toast.success(initialData ? 'Batch updated successfully!' : 'Batch created successfully in Draft state!');
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
    <form onSubmit={handleSubmit} className="space-y-8 w-full">
      {errorMsg && (
        <Alert variant="error" title="Form Validation Error">
          {errorMsg}
        </Alert>
      )}

      {/* Stepper Header */}
      <div className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${step === 1 ? 'bg-indigo-600 text-white' : 'bg-green-100 text-green-700'}`}>
              {step > 1 ? '✓' : '1'}
            </span>
            <span className={`text-sm font-semibold ${step === 1 ? 'text-slate-800' : 'text-slate-400'}`}>Details & Dates</span>
          </div>
          <div className="w-12 h-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              2
            </span>
            <span className={`text-sm font-semibold ${step === 2 ? 'text-slate-800' : 'text-slate-400'}`}>Capacity & Controls</span>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-medium">Step {step} of 2</div>
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1: Identification & Mapping */}
          <div className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Batch Parameters</h3>
                <p className="text-xs text-slate-500">Provide code, bilingual titles, and course association</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField>
                <FormLabel required>Batch Code (unique uppercase)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. B-OSHA-01"
                    value={batchCode}
                    onChange={(e) => setBatchCode(e.target.value.toUpperCase())}
                    className="font-mono uppercase"
                  />
                </FormControl>
              </FormField>

              <FormField>
                <FormLabel required>Parent Course</FormLabel>
                <FormControl>
                  <Select
                    placeholder="Select Course"
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    options={courses.map((c) => ({ value: c.id, label: `${c.nameEnglish} (${c.courseCode})` }))}
                  />
                </FormControl>
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField>
                <FormLabel required>Select Branch</FormLabel>
                <FormControl>
                  <Select
                    placeholder="Select Branch"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    options={branches.map((b) => ({ value: b.id, label: b.branchName }))}
                  />
                </FormControl>
              </FormField>

              <FormField>
                <FormLabel>Classroom (Optional)</FormLabel>
                <FormControl>
                  <Select
                    placeholder="Select Classroom"
                    value={classroomId}
                    onChange={(e) => setClassroomId(e.target.value)}
                    options={classrooms.map((c) => ({ value: c.id, label: `${c.classroomName} (Cap: ${c.capacity})` }))}
                  />
                </FormControl>
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <FormField>
                <FormLabel required>Batch Name (Arabic)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="الاسم بالعربية"
                    value={batchNameArabic}
                    onChange={(e) => setBatchNameArabic(e.target.value)}
                    className="text-right font-arabic"
                    dir="rtl"
                  />
                </FormControl>
              </FormField>
            </div>
          </div>

          {/* Card 2: Scheduling Dates */}
          <div className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Timeline & Scheduling</h3>
                  <p className="text-xs text-slate-500">Define batch start date, end date, and normalizations</p>
                </div>
              </div>

              <div className="space-y-4">
                <FormField>
                  <FormLabel required>Start Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={startDate}
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
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </FormControl>
                </FormField>
              </div>
            </div>

            <div className="flex justify-end pt-8">
              <Button type="button" onClick={handleNext} disabled={!isStep1Valid}>
                Next: Capacity & Controls
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1: Capacity & Corporate settings */}
          <div className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Capacity & Student Controls</h3>
                <p className="text-xs text-slate-500">Define maximum enrollments and B2B client overrides</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <FormLabel>Corporate Client Account ID (Optional UUID)</FormLabel>
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
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <input
                  id="waitingListEnabled"
                  type="checkbox"
                  checked={waitingListEnabled}
                  onChange={(e) => setWaitingListEnabled(e.target.checked)}
                  className="h-4.5 w-4.5 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <label htmlFor="waitingListEnabled" className="text-sm font-semibold text-slate-800 block cursor-pointer">
                    Enable Waiting List Queue
                  </label>
                  <span className="text-xs text-slate-500">Automatically redirect enrollments to waiting list queue when capacity limit is reached.</span>
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
                  <label htmlFor="allowOverbooking" className="text-sm font-semibold text-slate-800 block cursor-pointer">
                    Allow Overbooking limits
                  </label>
                  <span className="text-xs text-slate-500">Bypass standard batch capacity limits for corporate or prioritized bookings.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <input
                  id="isWalkIn"
                  type="checkbox"
                  checked={isWalkIn}
                  onChange={(e) => setIsWalkIn(e.target.checked)}
                  className="h-4.5 w-4.5 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <label htmlFor="isWalkIn" className="text-sm font-semibold text-slate-800 block cursor-pointer">
                    Walk-in Program Configuration
                  </label>
                  <span className="text-xs text-slate-500">Designate this batch for rapid same-day completions and fast-track learning journeys.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Summary / Guidelines */}
          <div className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Review Parameters</h3>
                  <p className="text-xs text-slate-500">Check configured options before saving as Draft</p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-600 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between pb-2 border-b border-slate-200/50">
                  <span className="font-medium">Batch Code:</span>
                  <span className="font-mono text-slate-800 uppercase">{batchCode || 'Not set'}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200/50">
                  <span className="font-medium">English Name:</span>
                  <span className="text-slate-800">{batchNameEnglish || 'Not set'}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200/50">
                  <span className="font-medium">Dates Scope:</span>
                  <span className="text-slate-800">
                    {startDate ? `${startDate} to ${endDate}` : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Capacity Limit:</span>
                  <span className="text-slate-800 font-bold">{capacity} seats</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-8 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating...</span>
                  </div>
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
