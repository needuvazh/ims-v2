'use client';

import { useState, useEffect } from 'react';
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
  Users,
} from 'lucide-react';
import { cloneBatchAction } from '../actions';

interface CloneBatchFormProps {
  courses: any[];
  branches: any[];
  classrooms: any[];
  trainersList: any[];
  sourceBatch: any;
  sourceSessions: any[];
  initialTrainerId?: string;
}

export function CloneBatchForm({
  courses,
  branches,
  classrooms,
  trainersList,
  sourceBatch,
  sourceSessions,
  initialTrainerId = '',
}: CloneBatchFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // General Batch Fields
  const [batchNameEnglish, setBatchNameEnglish] = useState(
    `${sourceBatch.batchNameEnglish} (Clone)`,
  );
  const [courseId, setCourseId] = useState(sourceBatch.courseId || '');
  const [branchId, setBranchId] = useState(sourceBatch.branchId || '');
  const [capacity, setCapacity] = useState(
    sourceBatch.capacity?.toString() || '20',
  );
  const [isWalkIn, setIsWalkIn] = useState(sourceBatch.isWalkIn ?? false);
  const [corporateAccountId, setCorporateAccountId] = useState(
    sourceBatch.corporateAccountId || '',
  );

  // New Batch Dates & Faculty
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [primaryTrainerId, setPrimaryTrainerId] = useState(initialTrainerId);

  // Sessions State
  const [sessions, setSessions] = useState<any[]>([]);

  // Initialize Sessions
  useEffect(() => {
    const initialSessions = sourceSessions.map((s) => ({
      id: s.id,
      sessionNumber: s.sessionNumber,
      titleEnglish: s.titleEnglish,
      titleArabic: s.titleArabic,
      startTime: s.startTime,
      endTime: s.endTime,
      classroomId: s.classroomId || '',
      trainerId: s.trainerId || initialTrainerId || '',
      originalDate: new Date(s.sessionDate).toISOString().split('T')[0],
      sessionDate: '', // populated once newStartDate is filled
    }));
    setSessions(initialSessions);
  }, [sourceSessions, initialTrainerId]);

  // Handle auto-shifting session dates when newStartDate is modified
  const handleStartDateChange = (val: string) => {
    setNewStartDate(val);
    if (!val || !sourceBatch.startDate) return;

    try {
      const origStart = new Date(sourceBatch.startDate);
      const newStart = new Date(val);

      // Compute difference in days
      const diffMs = newStart.getTime() - origStart.getTime();
      const offsetDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      // Update all sessions based on offset
      setSessions((prev) =>
        prev.map((s) => {
          const origSessDate = new Date(s.originalDate);
          const newSessDate = new Date(
            origSessDate.getTime() + offsetDays * 24 * 60 * 60 * 1000,
          );
          return {
            ...s,
            sessionDate: newSessDate.toISOString().split('T')[0],
          };
        }),
      );

      // Automatically set the newEndDate if there is a shift, keeping the same batch duration
      if (sourceBatch.endDate) {
        const origEnd = new Date(sourceBatch.endDate);
        const newEnd = new Date(
          origEnd.getTime() + offsetDays * 24 * 60 * 60 * 1000,
        );
        setNewEndDate(newEnd.toISOString().split('T')[0]);
      }
    } catch (e) {
      console.error('Failed to shift dates:', e);
    }
  };

  // Propagate main trainer change to sessions that use the old trainer or are unassigned
  const handlePrimaryTrainerChange = (newTrainerId: string) => {
    const oldTrainerId = primaryTrainerId;
    setPrimaryTrainerId(newTrainerId);

    setSessions((prev) =>
      prev.map((s) => {
        // If the session trainer was equal to old trainer or is empty, update it
        if (s.trainerId === oldTrainerId || s.trainerId === '') {
          return { ...s, trainerId: newTrainerId };
        }
        return s;
      }),
    );
  };

  const handleSessionFieldChange = (index: number, field: string, value: any) => {
    setSessions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Check if form is valid
  const isFormValid =
    batchNameEnglish.trim().length >= 3 &&
    courseId &&
    branchId &&
    newStartDate &&
    newEndDate &&
    capacity &&
    parseInt(capacity, 10) > 0 &&
    sessions.every((s) => s.titleEnglish && s.sessionDate && s.startTime && s.endTime);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const payload = {
        sourceBatchId: sourceBatch.id,
        courseId,
        branchId,
        batchNameEnglish: batchNameEnglish.trim(),
        batchNameArabic: batchNameEnglish.trim(), // fallback Arabic to English name
        startDate: new Date(newStartDate).toISOString(),
        endDate: new Date(newEndDate).toISOString(),
        capacity: parseInt(capacity, 10),
        waitingListEnabled: sourceBatch.waitingListEnabled ?? true,
        allowOverbooking: sourceBatch.allowOverbooking ?? false,
        isWalkIn,
        corporateAccountId: corporateAccountId || null,
        primaryTrainerId: primaryTrainerId || null,
        sessions: sessions.map((s) => ({
          sessionNumber: s.sessionNumber,
          titleEnglish: s.titleEnglish,
          titleArabic: s.titleArabic || s.titleEnglish,
          sessionDate: new Date(s.sessionDate).toISOString(),
          startTime: s.startTime,
          endTime: s.endTime,
          classroomId: s.classroomId || null,
          trainerId: s.trainerId || null,
        })),
      };

      const res = await cloneBatchAction(payload);

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to clone batch.');
        toast.error(res.error || 'Failed to clone batch.');
      } else {
        toast.success(`Batch cloned successfully! Cloned Code: ${res.data.batch.batchCode}`);
        router.push(`/batches/${res.data.batch.id}`);
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
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      {errorMsg && (
        <Alert variant="error" title="Form Verification Failed">
          {errorMsg}
        </Alert>
      )}

      {/* Grid: Params & Timeline */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* General Parameters */}
        <div className="space-y-4 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Batch Parameters</h3>
              <p className="text-xs text-slate-500">
                General properties copied from original batch
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
                  placeholder="e.g. OSHA Safety - Batch 02"
                  value={batchNameEnglish}
                  onChange={(e) => setBatchNameEnglish(e.target.value)}
                />
              </FormControl>
            </FormField>
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
              <FormLabel>Corporate Client Account ID (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="UUID Format"
                  value={corporateAccountId}
                  onChange={(e) => setCorporateAccountId(e.target.value)}
                  className="font-mono text-sm"
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
                  Enable rapid same-day completion checks for this batch.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline & Primary Faculty */}
        <div className="space-y-4 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Timeline & Faculty</h3>
              <p className="text-xs text-slate-500">
                Specify new schedule dates and assign primary trainer
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField>
              <FormLabel required>New Start Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                />
              </FormControl>
            </FormField>

            <FormField>
              <FormLabel required>New End Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={newEndDate}
                  min={newStartDate || undefined}
                  onChange={(e) => setNewEndDate(e.target.value)}
                />
              </FormControl>
            </FormField>
          </div>

          <div>
            <FormField>
              <FormLabel>Primary Trainer</FormLabel>
              <FormControl>
                <Select
                  placeholder="Select Faculty Trainer"
                  value={primaryTrainerId}
                  onChange={(e) => handlePrimaryTrainerChange(e.target.value)}
                  options={trainersList.map((t) => ({
                    value: t.id,
                    label: `${t.displayName} (${t.email})`,
                  }))}
                />
              </FormControl>
            </FormField>
          </div>

          <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 text-indigo-950 text-xs leading-relaxed space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-indigo-900">
              <Users className="h-4 w-4" /> Tip: Dynamic Scheduler
            </div>
            <p>
              Entering the <strong>New Start Date</strong> will automatically offset all session dates based on the difference from the original schedule. Changing the <strong>Primary Trainer</strong> automatically updates all unassigned sessions in the list below.
            </p>
          </div>
        </div>
      </div>

      {/* Sessions Planner Section */}
      <div className="rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Sessions Schedule Planner</h3>
            <p className="text-xs text-slate-500">
              Review and customize individual session times, dates, and classroom allocations
            </p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="p-8 text-center text-sm text-[color:var(--ims-muted)] border border-dashed rounded-xl">
            No session slots to replicate. If the original batch has no sessions, you can schedule them manually after cloning.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold">
                  <th className="p-3 w-12 text-center">Num</th>
                  <th className="p-3 w-48">Session Title</th>
                  <th className="p-3 w-36">Scheduled Date</th>
                  <th className="p-3 w-44">Time Window</th>
                  <th className="p-3 w-40">Classroom</th>
                  <th className="p-3 w-44">Trainer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-500 text-center">
                      #{s.sessionNumber}
                    </td>
                    <td className="p-3 space-y-1">
                      <Input
                        value={s.titleEnglish}
                        onChange={(e) =>
                          handleSessionFieldChange(idx, 'titleEnglish', e.target.value)
                        }
                        className="h-8 py-1 px-2 text-xs"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="date"
                        value={s.sessionDate}
                        onChange={(e) =>
                          handleSessionFieldChange(idx, 'sessionDate', e.target.value)
                        }
                        className="h-8 py-1 px-2 text-xs"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="time"
                          value={s.startTime}
                          onChange={(e) =>
                            handleSessionFieldChange(idx, 'startTime', e.target.value)
                          }
                          className="h-8 py-1 px-2 text-xs w-20"
                        />
                        <span className="text-slate-400 font-medium">-</span>
                        <Input
                          type="time"
                          value={s.endTime}
                          onChange={(e) =>
                            handleSessionFieldChange(idx, 'endTime', e.target.value)
                          }
                          className="h-8 py-1 px-2 text-xs w-20"
                        />
                      </div>
                    </td>
                    <td className="p-3">
                      <select
                        value={s.classroomId}
                        onChange={(e) =>
                          handleSessionFieldChange(idx, 'classroomId', e.target.value)
                        }
                        className="w-full text-xs h-8 border border-slate-200 rounded-lg px-2 bg-white text-slate-800"
                      >
                        <option value="">No Room</option>
                        {classrooms.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.classroomName}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <select
                        value={s.trainerId}
                        onChange={(e) =>
                          handleSessionFieldChange(idx, 'trainerId', e.target.value)
                        }
                        className="w-full text-xs h-8 border border-slate-200 rounded-lg px-2 bg-white text-slate-800"
                      >
                        <option value="">No Trainer</option>
                        {trainersList.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.displayName}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Buttons block */}
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/batches/${sourceBatch.id}`)}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !isFormValid}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Cloning Batch...</span>
            </div>
          ) : (
            'Save Clone'
          )}
        </Button>
      </div>
    </form>
  );
}
