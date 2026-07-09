'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Card,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  FormField,
  FormLabel,
  FormControl,
  Alert,
} from '@ims/shared-ui';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Loader2,
  CheckCircle,
  XCircle,
  HelpCircle,
  AlertTriangle,
  ArrowLeft,
  CalendarCheck,
} from 'lucide-react';
import Link from 'next/link';

interface SessionScheduleFormProps {
  batchId: string;
  courseId: string;
  branchId: string;
  batchCode: string;
  batchName: string;
  trainersList: any[];
  classroomsList: any[];
  onSubmitAction: (batchId: string, data: any) => Promise<any>;
  initialData?: any;
  batchStartDate?: string;
  batchEndDate?: string;
}

export function SessionScheduleForm({
  batchId,
  courseId,
  branchId,
  batchCode,
  batchName,
  trainersList,
  classroomsList,
  onSubmitAction,
  initialData,
  batchStartDate,
  batchEndDate,
}: SessionScheduleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form states
  const [sessionNumber, setSessionNumber] = useState(
    initialData?.sessionNumber?.toString() || '',
  );
  const [titleEnglish, setTitleEnglish] = useState(
    initialData?.titleEnglish || '',
  );
  const [sessionDate, setSessionDate] = useState(
    initialData?.sessionDate
      ? new Date(initialData.sessionDate).toISOString().split('T')[0]
      : '',
  );
  const [startTime, setStartTime] = useState(initialData?.startTime || '09:00');
  const [endTime, setEndTime] = useState(initialData?.endTime || '12:00');
  const [trainerId, setTrainerId] = useState(initialData?.trainerId || '');
  const [classroomId, setClassroomId] = useState(
    initialData?.classroomId || '',
  );

  // Availability states
  const [trainerAvailability, setTrainerAvailability] = useState<any[]>([]);
  const [classroomAvailability, setClassroomAvailability] = useState<any[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [hasCheckedOnce, setHasCheckedOnce] = useState(false);
  const [selectedTrainerForDetails, setSelectedTrainerForDetails] = useState<any | null>(null);

  // Fetch availability
  const fetchAvailability = async (date: string, start: string, end: string) => {
    if (!date || !start || !end) return;
    setLoadingAvailability(true);
    try {
      const sessionIdParam = initialData?.id ? `&sessionId=${initialData.id}` : '';
      const [trainerRes, classroomRes] = await Promise.all([
        fetch(
          `/api/v1/faculty/eligible-trainers?courseId=${courseId}&branchId=${branchId}&targetDate=${date}&startTime=${start}&endTime=${end}${sessionIdParam}`,
        ),
        fetch(
          `/api/v1/batches/${batchId}/classrooms/availability?sessionDate=${date}&startTime=${start}&endTime=${end}`,
        ),
      ]);

      const trainerJson = await trainerRes.json();
      const classroomJson = await classroomRes.json();

      if (trainerJson.success) {
        setTrainerAvailability(trainerJson.data?.items || []);
      }
      if (classroomJson.success) {
        setClassroomAvailability(classroomJson.classrooms || []);
      }
      setHasCheckedOnce(true);
    } catch (err) {
      console.error('Error fetching availability:', err);
      toast.error('Failed to fetch real-time availability information.');
    } finally {
      setLoadingAvailability(false);
    }
  };

  // Re-fetch availability when date or times change
  useEffect(() => {
    if (sessionDate && startTime && endTime) {
      fetchAvailability(sessionDate, startTime, endTime);
    } else {
      setTrainerAvailability([]);
      setClassroomAvailability([]);
      setHasCheckedOnce(false);
    }
  }, [sessionDate, startTime, endTime]);

  // Evaluate conflicts
  const getSelectedTrainerStatus = () => {
    if (!trainerId || !hasCheckedOnce) return null;
    const match = trainerAvailability.find((t) => t.trainerId === trainerId);
    if (!match) {
      return {
        eligible: false,
        message: 'Trainer profile not authorized or inactive for this course.',
      };
    }
    return {
      eligible: match.eligible,
      message: match.eligible
        ? 'Available & Authorized'
        : match.reasonCodes
            ?.map((code: string) => {
              if (code === 'SESSION_OVERLAP') return 'Has overlapping scheduled sessions.';
              if (code === 'TRAINER_ON_LEAVE') return 'On approved leave.';
              if (code === 'TRAINER_NOT_AVAILABLE') return 'Weekly availability slot missing.';
              return code.split('_').join(' ').toLowerCase();
            })
            .join(', ') || 'Occupied',
    };
  };

  const getSelectedClassroomStatus = () => {
    if (!classroomId || !hasCheckedOnce) return null;
    const match = classroomAvailability.find((c) => c.id === classroomId);
    if (!match) return null;
    return {
      available: match.available,
      message: match.available
        ? 'Available'
        : match.conflicts?.map((c: any) => c.message).join(', ') || 'Occupied',
    };
  };

  const getGeneralConflict = () => {
    if (!hasCheckedOnce || classroomAvailability.length === 0) return null;
    const firstRoom = classroomAvailability[0];
    const holidayOrHours = firstRoom.conflicts?.find(
      (c: any) => c.type === 'HOLIDAY' || c.type === 'OPERATING_HOURS',
    );
    return holidayOrHours || null;
  };

  const trainerStatus = getSelectedTrainerStatus();
  const classroomStatus = getSelectedClassroomStatus();
  const generalConflict = getGeneralConflict();

  const isFormValid =
    sessionNumber.trim() !== '' &&
    titleEnglish.trim() !== '' &&
    sessionDate !== '' &&
    startTime !== '' &&
    endTime !== '' &&
    trainerId !== '' &&
    classroomId !== '';

  const hasConflict =
    !hasCheckedOnce ||
    !trainerStatus?.eligible ||
    !classroomStatus?.available ||
    !!generalConflict;

  const isSubmittable = isFormValid && !hasConflict && !loadingAvailability;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSubmittable) return;

    startTransition(async () => {
      try {
        const payload = {
          sessionNumber,
          titleEnglish,
          titleArabic: titleEnglish, // Fallback to English title to satisfy schema requirement
          sessionDate,
          startTime,
          endTime,
          trainerId: trainerId || null,
          classroomId: classroomId || null,
        };

        const res = await onSubmitAction(batchId, payload);
        if (res && !res.success) {
          toast.error(res.error || 'Failed to save session.');
        } else {
          toast.success(
            initialData
              ? 'Session updated successfully!'
              : 'Session scheduled successfully!',
          );
          router.push(`/batches/${batchId}`);
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || 'An unexpected error occurred.');
      }
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3">
          <Link href={`/batches/${batchId}`}>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {initialData ? 'Edit Session' : 'Schedule Session'}
            </h2>
            <p className="text-xs text-slate-500">
              Batch: <span className="font-mono font-bold text-slate-700">{batchCode}</span> ({batchName})
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full w-fit">
          Branch Scoped Check
        </div>
      </div>

      {generalConflict && (
        <Alert variant="error" title="General Scheduling Conflict">
          {generalConflict.message}
        </Alert>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-1 space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <CalendarCheck className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-800">Session Parameters</h3>
          </div>

          <div className="space-y-4">
            <FormField>
              <FormLabel required>Session Number</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 1"
                  value={sessionNumber}
                  onChange={(e) => setSessionNumber(e.target.value)}
                />
              </FormControl>
            </FormField>

            <FormField>
              <FormLabel required>Title (English)</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Session 1: Setup"
                  value={titleEnglish}
                  onChange={(e) => setTitleEnglish(e.target.value)}
                />
              </FormControl>
            </FormField>

            <FormField>
              <FormLabel required>Session Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  min={batchStartDate}
                  max={batchEndDate}
                />
              </FormControl>
              {(batchStartDate || batchEndDate) && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Allowed range: {batchStartDate ? new Date(batchStartDate).toLocaleDateString() : 'Start'} to {batchEndDate ? new Date(batchEndDate).toLocaleDateString() : 'End'}
                </p>
              )}
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField>
                <FormLabel required>Start Time</FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </FormControl>
              </FormField>
              <FormField>
                <FormLabel required>End Time</FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </FormControl>
              </FormField>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
            {isSubmittable ? (
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : initialData ? (
                  'Update Session'
                ) : (
                  'Schedule Session'
                )}
              </Button>
            ) : (
              <div className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded-xl p-3 text-center text-xs font-semibold">
                {!isFormValid
                  ? 'Submit Blocked: Fill Required Fields'
                  : 'Submit Blocked: Resolve Availability Conflicts'}
              </div>
            )}
            <Link href={`/batches/${batchId}`} className="w-full">
              <Button type="button" variant="outline" className="w-full">
                Cancel
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Column: Live Availability Views */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trainer Availability Grid */}
          <Card className="p-5 bg-white/80 border border-[color:var(--ims-border)] shadow-sm backdrop-blur-md rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="font-semibold text-slate-800">Trainer Availability View</h3>
                  <p className="text-[10px] text-slate-400">Click an available card to assign trainer. (Required)</p>
                </div>
              </div>
              {loadingAvailability && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Checking...</span>
                </div>
              )}
            </div>

            {!sessionDate || !startTime || !endTime ? (
              <div className="py-8 text-center text-slate-400 text-xs font-medium flex flex-col items-center justify-center gap-2">
                <Clock className="h-8 w-8 text-slate-300" />
                <span>Specify Date and Times to load trainer schedule status.</span>
              </div>
            ) : trainersList.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No active trainers in the directory.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[22rem] overflow-y-auto pr-1">
                {trainersList.map((t) => {
                  const status = trainerAvailability.find((item) => item.trainerId === t.id);
                  const isEligible = status?.eligible ?? false;
                  const isSelected = t.id === trainerId;
                  const reason = status
                    ? status.eligible
                      ? 'Available'
                      : status.reasonCodes
                          ?.map((code: string) => {
                            if (code === 'SESSION_OVERLAP') return 'Overlap';
                            if (code === 'TRAINER_ON_LEAVE') return 'Leave';
                            if (code === 'TRAINER_NOT_AVAILABLE') return 'Unavailable';
                            return code.toLowerCase().split('_').join(' ');
                          })
                          .join(', ')
                    : 'Not Authorized / Inactive';

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (isEligible) {
                          setTrainerId(isSelected ? '' : t.id);
                        }
                      }}
                      className={`flex flex-col p-3 rounded-xl border transition-all duration-200 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-600/20'
                          : isEligible
                            ? 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm cursor-pointer'
                            : 'border-slate-100 bg-slate-50/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between w-full">
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-slate-800 truncate">{t.displayName}</p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{t.email}</p>
                          {isSelected && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                              <CheckCircle className="h-3 w-3" /> Selected
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTrainerForDetails({
                                ...t,
                                status,
                              });
                            }}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 underline font-semibold mt-1.5 block"
                          >
                            Show details
                          </button>
                        </div>
                        <Badge
                          variant={status ? (isEligible ? 'success' : 'error') : 'outline'}
                          className="shrink-0 text-[10px] px-2 py-0.5"
                        >
                          {reason}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Classroom Availability Grid */}
          <Card className="p-5 bg-white/80 border border-[color:var(--ims-border)] shadow-sm backdrop-blur-md rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="font-semibold text-slate-800">Classroom Availability View</h3>
                  <p className="text-[10px] text-slate-400">Click an available card to book classroom. (Required)</p>
                </div>
              </div>
              {loadingAvailability && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Checking...</span>
                </div>
              )}
            </div>

            {!sessionDate || !startTime || !endTime ? (
              <div className="py-8 text-center text-slate-400 text-xs font-medium flex flex-col items-center justify-center gap-2">
                <Clock className="h-8 w-8 text-slate-300" />
                <span>Specify Date and Times to load classroom allocation status.</span>
              </div>
            ) : classroomsList.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No active classrooms in this branch.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[22rem] overflow-y-auto pr-1">
                {classroomsList.map((c) => {
                  const status = classroomAvailability.find((item) => item.id === c.id);
                  const isAvailable = status?.available ?? false;
                  const isSelected = c.id === classroomId;
                  const reason = status
                    ? status.available
                      ? 'Available'
                      : status.conflicts?.map((co: any) => co.message).join(', ') || 'Occupied'
                    : 'Loading...';

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        if (isAvailable) {
                          setClassroomId(isSelected ? '' : c.id);
                        }
                      }}
                      className={`flex items-start justify-between p-3 rounded-xl border transition-all duration-200 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-600/20'
                          : isAvailable
                            ? 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm cursor-pointer'
                            : 'border-slate-100 bg-slate-50/50 opacity-60'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-800 truncate">{c.classroomName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Capacity: {(status?.capacity ?? c.capacity) || 'N/A'}</p>
                        {isSelected && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            <CheckCircle className="h-3 w-3" /> Selected
                          </span>
                        )}
                      </div>
                      <Badge
                        variant={isAvailable ? 'success' : 'error'}
                        className="shrink-0 text-[10px] px-2 py-0.5 max-w-[120px] truncate"
                        title={reason}
                      >
                        {reason}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </form>

    {/* Trainer Details & Conflicts Dialog */}
    <Dialog
      open={!!selectedTrainerForDetails}
      onOpenChange={(open) => !open && setSelectedTrainerForDetails(null)}
    >
      <DialogContent className="max-w-md bg-white border border-slate-200 shadow-lg rounded-2xl p-6">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <DialogTitle className="text-sm font-bold text-slate-800">Trainer Availability Details</DialogTitle>
          <DialogDescription className="text-xs text-slate-450 mt-1">
            Review authorization status, leave periods, and conflicting sessions.
          </DialogDescription>
        </DialogHeader>

        {selectedTrainerForDetails && (
          <div className="space-y-4 pt-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-800">{selectedTrainerForDetails.displayName}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{selectedTrainerForDetails.email}</p>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">Eligibility Checklist:</p>
              
              <div className="flex items-center gap-2">
                {selectedTrainerForDetails.status ? (
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                )}
                <span className={selectedTrainerForDetails.status ? 'text-slate-600' : 'text-rose-700 font-medium'}>
                  Active Profile in target Branch
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedTrainerForDetails.status && !selectedTrainerForDetails.status.reasonCodes?.includes('COURSE_NOT_AUTHORIZED') ? (
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                )}
                <span className={(selectedTrainerForDetails.status && !selectedTrainerForDetails.status.reasonCodes?.includes('COURSE_NOT_AUTHORIZED')) ? 'text-slate-600' : 'text-rose-700 font-medium'}>
                  Authorized for Course
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedTrainerForDetails.status && !selectedTrainerForDetails.status.reasonCodes?.includes('TRAINER_NOT_AVAILABLE') ? (
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                )}
                <span className={(selectedTrainerForDetails.status && !selectedTrainerForDetails.status.reasonCodes?.includes('TRAINER_NOT_AVAILABLE')) ? 'text-slate-600' : 'text-rose-700 font-medium'}>
                  Weekly Schedule Availability
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedTrainerForDetails.status && !selectedTrainerForDetails.status.reasonCodes?.includes('TRAINER_ON_LEAVE') ? (
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                )}
                <span className={(selectedTrainerForDetails.status && !selectedTrainerForDetails.status.reasonCodes?.includes('TRAINER_ON_LEAVE')) ? 'text-slate-600' : 'text-rose-700 font-medium'}>
                  Not on Approved Leave
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedTrainerForDetails.status && !selectedTrainerForDetails.status.reasonCodes?.includes('SESSION_OVERLAP') ? (
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                )}
                <span className={(selectedTrainerForDetails.status && !selectedTrainerForDetails.status.reasonCodes?.includes('SESSION_OVERLAP')) ? 'text-slate-600' : 'text-rose-700 font-medium'}>
                  No Scheduled Session Overlaps
                </span>
              </div>
            </div>

            {selectedTrainerForDetails.status?.conflicts && selectedTrainerForDetails.status.conflicts.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <p className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Overlapping Sessions ({selectedTrainerForDetails.status.conflicts.length})
                </p>
                <div className="border border-slate-150 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                  <table className="w-full text-[10px] text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 font-bold text-slate-600">
                        <th className="p-2">Batch Code</th>
                        <th className="p-2">Session</th>
                        <th className="p-2">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTrainerForDetails.status.conflicts.map((conflict: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 last:border-b-0">
                          <td className="p-2 font-medium text-slate-800">{conflict.batchCode}</td>
                          <td className="p-2 text-slate-600">
                            {conflict.sessionNumber ? `#${conflict.sessionNumber}` : 'N/A'}
                          </td>
                          <td className="p-2 text-slate-600 text-nowrap">
                            {conflict.startTime} - {conflict.endTime}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
