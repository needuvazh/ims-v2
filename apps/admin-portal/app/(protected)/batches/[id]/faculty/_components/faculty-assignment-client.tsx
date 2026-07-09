'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Clock,
  UserCheck,
  Info,
  CalendarPlus,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  FormLabel,
  Input,
  Select,
} from '@ims/shared-ui';
import { toast } from 'sonner';
import { assignTrainerAction } from '../../../actions';

interface SessionConflict {
  sessionDate: string;
  startTime: string;
  endTime: string;
  batchCode: string;
  sessionNumber?: number;
}

interface FacultyEligibilityResult {
  trainerId: string;
  trainerCode: string;
  displayName: {
    en: string;
    ar?: string | null;
  };
  trainerType: string;
  branchName?: string;
  status: string;
  eligible: boolean;
  isAssignable: boolean;
  alreadyAssigned: boolean;
  reasonCodes: string[];
  reasons: string[];
  sessionConflicts?: SessionConflict[];
  assignment?: {
    role: string;
    assignedFrom: string;
    assignedTo: string;
  } | null;
}

interface CourseOption {
  id: string;
  courseCode: string;
  nameEnglish: string;
}

interface FacultyAssignmentClientProps {
  batchId: string;
  batchCode: string;
  courseId: string;
  courseName: string;
  startDate: string;
  endDate: string;
  courses: CourseOption[];
}

export function FacultyAssignmentClient({
  batchId,
  batchCode,
  courseId,
  courseName,
  startDate,
  endDate,
  courses,
}: FacultyAssignmentClientProps) {
  const router = useRouter();
  const [selectedCourseId, setSelectedCourseId] = useState(courseId);
  const [targetDate, setTargetDate] = useState(startDate);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyEligible, setShowOnlyEligible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [trainers, setTrainers] = useState<FacultyEligibilityResult[]>([]);

  // Assignment Modal State
  const [selectedTrainerForAssignment, setSelectedTrainerForAssignment] =
    useState<FacultyEligibilityResult | null>(null);
  const [role, setRole] = useState('Primary');
  const [assignedFrom, setAssignedFrom] = useState(startDate);
  const [assignedTo, setAssignedTo] = useState(endDate);
  const [assigning, setAssigning] = useState(false);

  // More Details Modal State
  const [selectedTrainerForDetails, setSelectedTrainerForDetails] =
    useState<FacultyEligibilityResult | null>(null);

  // Conflict Details Modal State
  const [selectedTrainerForConflicts, setSelectedTrainerForConflicts] =
    useState<FacultyEligibilityResult | null>(null);

  const loadTrainers = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/batches/${batchId}/trainers/eligibility?courseId=${selectedCourseId}&targetDate=${targetDate}`
      );
      if (!res.ok) {
        throw new Error('Failed to load eligibility data.');
      }
      const data = await res.json();
      if (data.success) {
        setTrainers(data.eligibleTrainers);
      } else {
        toast.error(data.messageEnglish || 'Failed to check eligibility.');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while loading trainers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrainers();
  }, [selectedCourseId, targetDate]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainerForAssignment) return;

    if (assignedTo < assignedFrom) {
      toast.error('Assignment end date must be greater than or equal to start date.');
      return;
    }
    if (assignedFrom < startDate || assignedTo > endDate) {
      toast.error('Assignment dates must fall within the batch date range.');
      return;
    }

    setAssigning(true);
    try {
      const res = await assignTrainerAction(batchId, {
        trainerId: selectedTrainerForAssignment.trainerId,
        role,
        assignedFrom: new Date(assignedFrom).toISOString(),
        assignedTo: new Date(assignedTo).toISOString(),
      });
      if (res.success) {
        toast.success('Faculty assigned successfully!');
        setSelectedTrainerForAssignment(null);
        await loadTrainers();
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to assign trainer.');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
    } finally {
      setAssigning(false);
    }
  };

  const filteredTrainers = trainers.filter((t) => {
    const matchesSearch =
      t.displayName.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.trainerCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOnlyEligible = !showOnlyEligible || t.eligible;
    return matchesSearch && matchesOnlyEligible;
  });

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
        <div className="flex flex-col gap-1.5">
          <FormLabel>Filter by Course</FormLabel>
          <Select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            options={courses.map((c) => ({
              value: c.id,
              label: `${c.nameEnglish} (${c.courseCode})`,
            }))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <FormLabel>Target Assessment Date</FormLabel>
          <Input
            type="date"
            value={targetDate}
            min={startDate}
            max={endDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <FormLabel>Search Trainer Name/Code</FormLabel>
          <div className="relative">
            <Input
              placeholder="Enter name or code"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          </div>
        </div>

        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer select-none py-2 px-3 hover:bg-slate-100 rounded-lg transition">
            <input
              type="checkbox"
              checked={showOnlyEligible}
              onChange={(e) => setShowOnlyEligible(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5"
            />
            <span className="text-sm font-medium text-slate-700">
              Show Eligible Only
            </span>
          </label>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="text-sm text-slate-500 font-medium">Evaluating trainer eligibility...</span>
        </div>
      ) : filteredTrainers.length === 0 ? (
        <div className="text-center py-20 text-slate-500 border border-dashed border-slate-200 rounded-2xl">
          No trainers match the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTrainers.map((t) => (
            <Card
              key={t.trainerId}
              className={`p-5 flex flex-col justify-between border transition hover:shadow-md ${
                t.alreadyAssigned
                  ? 'border-blue-100 bg-blue-50/10'
                  : t.eligible
                  ? 'border-emerald-100 bg-emerald-50/10'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-slate-800 text-base">
                      {t.displayName.en}
                    </h4>
                    <span className="font-mono text-xs text-slate-500">
                      Code: {t.trainerCode} | {t.trainerType}
                    </span>
                  </div>
                  {t.alreadyAssigned ? (
                    <Badge variant="info">Already Assigned</Badge>
                  ) : t.eligible ? (
                    <Badge variant="success">Eligible</Badge>
                  ) : (
                    <Badge variant="error">Not Eligible</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Status: <strong>{t.status}</strong></span>
                  </div>
                  {t.branchName && (
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate">Branch: <strong>{t.branchName}</strong></span>
                    </div>
                  )}
                </div>

                {/* Sub status indicators */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs">
                    {!t.reasonCodes.includes('COURSE_NOT_AUTHORIZED') ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle className="h-3.5 w-3.5" /> Course Authorized
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                        <XCircle className="h-3.5 w-3.5" /> Course Not Authorized
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {!t.reasonCodes.includes('LEAVE_OVERLAP') && !t.reasonCodes.includes('LEAVE_ON_TARGET_DATE') ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle className="h-3.5 w-3.5" /> No Leaves Overlap
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                        <XCircle className="h-3.5 w-3.5" /> Leave Overlap
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {!t.reasonCodes.includes('SESSION_OVERLAP') ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle className="h-3.5 w-3.5" /> No Session Conflicts
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                        <AlertCircle className="h-3.5 w-3.5" /> Session Conflicts (Non-blocking)
                      </span>
                    )}
                  </div>
                </div>

                {t.alreadyAssigned && t.assignment && (
                  <div className="mt-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100/50 text-xs text-blue-800 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5 text-blue-900">
                      <UserCheck className="h-3.5 w-3.5" />
                      Assigned as {t.assignment.role}
                    </div>
                    <div>
                      From: <strong>{new Date(t.assignment.assignedFrom).toLocaleDateString()}</strong> to: <strong>{new Date(t.assignment.assignedTo).toLocaleDateString()}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-slate-100">
                {t.reasonCodes.includes('SESSION_OVERLAP') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 text-amber-700 border-amber-200 hover:bg-amber-50"
                    onClick={() => setSelectedTrainerForConflicts(t)}
                  >
                    <Calendar className="h-3.5 w-3.5" /> View Conflicts
                  </Button>
                )}
                {!t.eligible && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => setSelectedTrainerForDetails(t)}
                  >
                    <Info className="h-3.5 w-3.5" /> More Details
                  </Button>
                )}
                {t.eligible ? (
                  <Button
                    size="sm"
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => {
                      setSelectedTrainerForAssignment(t);
                      setAssignedFrom(startDate);
                      setAssignedTo(endDate);
                    }}
                  >
                    <CalendarPlus className="h-4 w-4" /> Assign Faculty
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="cursor-not-allowed opacity-50"
                  >
                    Not Assignable
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Assignment Dialog */}
      <Dialog
        open={!!selectedTrainerForAssignment}
        onOpenChange={(open) => !open && setSelectedTrainerForAssignment(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAssign}>
            <DialogHeader>
              <DialogTitle>Assign Faculty</DialogTitle>
              <DialogDescription>
                Assign <strong>{selectedTrainerForAssignment?.displayName.en}</strong> to Batch <strong>{batchCode}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex flex-col gap-1.5">
                <FormLabel required>Assignment Role</FormLabel>
                <Select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  options={[
                    { value: 'Primary', label: 'Primary Trainer' },
                    { value: 'Assistant', label: 'Assistant Trainer' },
                    { value: 'Observer', label: 'Observer' },
                  ]}
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={assigning} className="bg-indigo-600 hover:bg-indigo-700">
                {assigning ? 'Assigning...' : 'Confirm Assignment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* More Details / Conflicts Dialog */}
      <Dialog
        open={!!selectedTrainerForDetails}
        onOpenChange={(open) => !open && setSelectedTrainerForDetails(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-5 w-5" />
              Ineligibility Details
            </DialogTitle>
            <DialogDescription>
              Trainer <strong>{selectedTrainerForDetails?.displayName.en}</strong> cannot be assigned to this batch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <h5 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
              Reasons for Restriction
            </h5>
            {selectedTrainerForDetails?.reasons && selectedTrainerForDetails.reasons.length > 0 ? (
              <ul className="space-y-2.5">
                {selectedTrainerForDetails.reasons.map((reason, idx) => (
                  <li
                    key={idx}
                    className="flex gap-2.5 p-3 rounded-lg bg-rose-50/50 border border-rose-100/50 text-slate-700 text-sm leading-relaxed"
                  >
                    <Info className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No specific reasons were provided.</p>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Conflicts Dialog */}
      <Dialog
        open={!!selectedTrainerForConflicts}
        onOpenChange={(open) => !open && setSelectedTrainerForConflicts(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Calendar className="h-5 w-5" />
              Session Conflicts Details
            </DialogTitle>
            <DialogDescription>
              Trainer <strong>{selectedTrainerForConflicts?.displayName.en}</strong> has schedule conflicts with other batches. These do not block assignment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[350px] overflow-y-auto pr-1">
            {selectedTrainerForConflicts?.sessionConflicts && selectedTrainerForConflicts.sessionConflicts.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {selectedTrainerForConflicts.sessionConflicts.map((conflict, idx) => (
                  <div key={idx} className="py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Calendar className="h-4 w-4 text-indigo-500" />
                        {new Date(conflict.sessionDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {conflict.startTime} - {conflict.endTime}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 self-start sm:self-center">
                      <Badge variant="warning" className="text-amber-800 bg-amber-50 border border-amber-100 font-medium">
                        Batch: {conflict.batchCode}
                      </Badge>
                      {conflict.sessionNumber && (
                        <Badge variant="outline" className="text-slate-600 font-mono text-xs">
                          Session {conflict.sessionNumber}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No session conflict details available.</p>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="w-full">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
