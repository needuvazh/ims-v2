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
  Users,
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
  classrooms,
  trainersList,
  onSubmitAction,
  initialData,
  initialTrainerId,
}: BatchFormProps) {
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
  const [startDate, setStartDate] = useState(
    initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : ''
  );
  const [endDate, setEndDate] = useState(
    initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : ''
  );
  const [capacity, setCapacity] = useState(initialData?.capacity?.toString() || '20');
  const [waitingListEnabled, setWaitingListEnabled] = useState(initialData?.waitingListEnabled ?? true);
  const [allowOverbooking, setAllowOverbooking] = useState(initialData?.allowOverbooking ?? false);
  const [isWalkIn, setIsWalkIn] = useState(initialData?.isWalkIn ?? false);
  const [corporateAccountId, setCorporateAccountId] = useState(initialData?.corporateAccountId || '');
  
  // Trainer assignment (Step 3)
  const [primaryTrainerId, setPrimaryTrainerId] = useState(initialTrainerId || '');
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  // Step 1 Validation
  const isStep1Valid =
    batchCode.trim().length >= 3 &&
    batchNameEnglish.trim().length >= 3 &&
    batchNameArabic.trim().length >= 3 &&
    courseId &&
    branchId &&
    startDate &&
    endDate;

  const checkConflicts = async (trainerId: string) => {
    if (!trainerId || !initialData?.id) {
      setConflicts([]);
      return;
    }
    setCheckingConflicts(true);
    try {
      const res = await fetch(
        `/api/v1/batches/${initialData.id}/trainers/conflicts?trainerId=${trainerId}&assignedFrom=${startDate}&assignedTo=${endDate}`
      );
      const json = await res.json();
      if (json.success) {
        setConflicts(json.conflicts || []);
      } else {
        setConflicts([]);
      }
    } catch {
      setConflicts([]);
    } finally {
      setCheckingConflicts(false);
    }
  };

  const handleTrainerChange = async (val: string) => {
    setPrimaryTrainerId(val);
    if (initialData?.id && val) {
      await checkConflicts(val);
    } else {
      setConflicts([]);
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
    } else if (step === 2) {
      setErrorMsg(null);
      if (initialData) {
        return;
      }
      // Run pre-check for conflicts if trainer was preselected/initial trainer exists
      if (primaryTrainerId && initialData?.id) {
        checkConflicts(primaryTrainerId);
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 3 && !initialData) return;

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
        ...(initialData ? {} : { primaryTrainerId: primaryTrainerId || null }),
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
            <span
              className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                step === 1 ? 'bg-indigo-600 text-white' : 'bg-green-100 text-green-700'
              }`}
            >
              {step > 1 ? '✓' : '1'}
            </span>
            <span className={`text-sm font-semibold ${step === 1 ? 'text-slate-800' : 'text-slate-400'}`}>
              Details & Dates
            </span>
          </div>
          <div className="w-12 h-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                step === 2 ? 'bg-indigo-600 text-white' : step === 3 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {step > 2 ? '✓' : '2'}
            </span>
            <span className={`text-sm font-semibold ${step === 2 ? 'text-slate-800' : 'text-slate-400'}`}>
              Capacity & Controls
            </span>
          </div>
          {!initialData && (
            <>
              <div className="w-12 h-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <span
                  className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                    step === 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  3
                </span>
                <span className={`text-sm font-semibold ${step === 3 ? 'text-slate-800' : 'text-slate-400'}`}>
                  Faculty Assignment
                </span>
              </div>
            </>
          )}
        </div>
        <div className="text-xs text-slate-400 font-medium">Step {step} of {initialData ? '2' : '3'}</div>
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
                    options={courses.map((c) => ({
                      value: c.id,
                      label: `${c.nameEnglish} (${c.courseCode})`,
                    }))}
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
                    options={classrooms.map((c) => ({
                      value: c.id,
                      label: `${c.classroomName} (Cap: ${c.capacity})`,
                    }))}
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
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </FormControl>
                </FormField>

                <FormField>
                  <FormLabel required>End Date</FormLabel>
                  <FormControl>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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
                  <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
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
                  <label
                    htmlFor="waitingListEnabled"
                    className="text-sm font-semibold text-slate-800 block cursor-pointer"
                  >
                    Enable Waiting List Queue
                  </label>
                  <span className="text-xs text-slate-500">
                    Automatically redirect enrollments to waiting list queue when capacity limit is reached.
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
                    Bypass standard batch capacity limits for corporate or prioritized bookings.
                  </span>
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
                  <span className="text-xs text-slate-500">
                    Designate this batch for rapid same-day completions and fast-track learning journeys.
                  </span>
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
                  <p className="text-xs text-slate-500">Check configured options before proceeding</p>
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
              <Button 
                type={initialData ? "submit" : "button"} 
                disabled={isSubmitting}
                onClick={initialData ? undefined : handleNext}
              >
                {initialData ? (isSubmitting ? 'Saving...' : 'Save Changes') : 'Next: Faculty Assignment'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Faculty Assignment Form */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Primary Trainer Allocation</h3>
                <p className="text-xs text-slate-500">Allocate a qualified primary trainer for the batch duration.</p>
              </div>
            </div>

            <FormField>
              <FormLabel>Select Primary Trainer (Optional in Draft)</FormLabel>
              <FormControl>
                <Select
                  placeholder="Select Trainer Profile"
                  value={primaryTrainerId}
                  onChange={(e) => handleTrainerChange(e.target.value)}
                  options={(trainersList || []).map((t) => ({
                    value: t.id,
                    label: `${t.displayName} (${t.email})`,
                  }))}
                />
              </FormControl>
            </FormField>

            {!primaryTrainerId && (
              <Alert variant="warning" title="Primary Trainer Required for Open Status">
                An active Primary Trainer must be assigned before this batch can be transitioned to OpenForEnrollment status. You can skip this now and assign it later.
              </Alert>
            )}

            {checkingConflicts && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking trainer schedule conflicts...</span>
              </div>
            )}

            {conflicts.length > 0 && (
              <div className="space-y-4">
                <Alert variant="error" title="Trainer Schedule Conflicts Detected">
                  The selected trainer has overlapping sessions in the following batches:
                </Alert>
                <div className="border border-red-100 bg-red-50/30 rounded-xl overflow-hidden">
                  <table className="min-w-full divide-y divide-red-100 text-xs">
                    <thead className="bg-red-50 text-red-700">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Batch Code</th>
                        <th className="px-4 py-2 text-left font-semibold">Date</th>
                        <th className="px-4 py-2 text-left font-semibold">Start Time</th>
                        <th className="px-4 py-2 text-left font-semibold">End Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100 text-slate-700">
                      {conflicts.map((c, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 font-mono font-bold">{c.batchCode}</td>
                          <td className="px-4 py-2">{new Date(c.sessionDate).toLocaleDateString()}</td>
                          <td className="px-4 py-2">{c.startTime}</td>
                          <td className="px-4 py-2">{c.endTime}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons & Summary */}
          <div className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Final Confirmation</h3>
                  <p className="text-xs text-slate-500 font-medium">Review final settings before submitting</p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-600 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between pb-2 border-b border-slate-200/50">
                  <span className="font-medium">Batch Code:</span>
                  <span className="font-mono text-slate-800 uppercase">{batchCode || 'Not set'}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200/50">
                  <span className="font-medium">Dates Scope:</span>
                  <span className="text-slate-800">
                    {startDate ? `${startDate} to ${endDate}` : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200/50">
                  <span className="font-medium">Primary Trainer:</span>
                  <span className="text-slate-800 font-medium text-right truncate max-w-[150px]">
                    {primaryTrainerId
                      ? (trainersList || []).find((t) => t.id === primaryTrainerId)?.displayName || 'Selected'
                      : 'None assigned'}
                  </span>
                </div>
                {conflicts.length > 0 && (
                  <div className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
                    Submit is blocked due to schedule conflicts.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-8 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button type="submit" disabled={isSubmitting || conflicts.length > 0 || checkingConflicts}>
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting...</span>
                  </div>
                ) : (
                  initialData ? 'Save Changes' : 'Create Batch'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
