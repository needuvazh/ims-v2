'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Card,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
  Input,
  Select,
  FormField,
  FormLabel,
  FormControl,
} from '@ims/shared-ui';
import {
  Calendar,
  Users,
  ShieldAlert,
  PlusCircle,
  Loader2,
  Bookmark,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  CircleSlash,
  Trash2,
  PlayCircle,
  ClipboardList,
  Edit,
} from 'lucide-react';
import {
  assignTrainerAction,
  unassignTrainerAction,
  addToWaitlistAction,
  manualPromoteAction,
  createSessionAction,
  skipWaitlistAction,
  reactivateWaitlistAction,
  removeWaitlistAction,
  reorderWaitlistAction,
} from '../actions';
import { openAttendanceSessionAction } from '../../attendance/actions';

interface BatchDetailsTabsProps {
  batchId: string;
  courseId: string;
  branchId: string;
  batchStatus: string;
  batchStartDate: string;
  batchEndDate: string;
  sessions: any[];
  attendanceSessions: any[];
  trainers: any[];
  waitlist: any[];
  trainersList: any[];
  studentsList: any[];
  leadsList: any[];
  classroomsList: any[];
  enrolledStudents: any[];
  isRegistrar: boolean;
  isCoordinator: boolean;
  waitingListEnabled?: boolean;
}

function getSessionScheduleTone(session: any) {
  if (session.scheduleStatus === 'Conflict') return 'bg-rose-50/70';
  if (session.isConflictIgnored || session.overrideReason)
    return 'bg-amber-50/70';
  return '';
}

function getScheduleStatusBadge(session: any) {
  if (session.scheduleStatus === 'Conflict') {
    return <Badge variant="error">Conflict</Badge>;
  }

  if (session.isConflictIgnored || session.overrideReason) {
    return (
      <Badge
        variant="outline"
        className="bg-amber-50 text-amber-700 border-amber-200"
      >
        Warning
      </Badge>
    );
  }

  if (session.scheduleStatus === 'Published') {
    return <Badge variant="success">Published</Badge>;
  }

  return <Badge variant="outline">{session.scheduleStatus}</Badge>;
}

export function BatchDetailsTabs({
  batchId,
  courseId,
  branchId,
  batchStatus,
  batchStartDate,
  batchEndDate,
  sessions,
  attendanceSessions,
  trainers,
  waitlist,
  trainersList,
  studentsList,
  leadsList,
  classroomsList,
  enrolledStudents,
  isRegistrar,
  isCoordinator,
}: BatchDetailsTabsProps) {
  const waitingListEnabled = false;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    'sessions' | 'trainers' | 'waitlist' | 'students'
  >('sessions');
  const [isPending, startTransition] = useTransition();
  const [unassigningId, setUnassigningId] = useState('');

  // Trainer form state
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [trainerRole, setTrainerRole] = useState<
    'Primary' | 'Assistant' | 'Observer'
  >('Primary');
  const [trainerFrom, setTrainerFrom] = useState(batchStartDate.split('T')[0]);
  const [trainerTo, setTrainerTo] = useState(batchEndDate.split('T')[0]);

  // Trainer Conflicts
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  const checkTrainerConflicts = async (
    trainerId: string,
    fromDate: string,
    toDate: string,
  ) => {
    if (!trainerId) {
      setConflicts([]);
      return;
    }
    setCheckingConflicts(true);
    try {
      const res = await fetch(
        `/api/v1/batches/${batchId}/trainers/conflicts?trainerId=${trainerId}&assignedFrom=${fromDate}&assignedTo=${toDate}`,
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

  const handleTrainerChange = (val: string) => {
    setSelectedTrainerId(val);
    checkTrainerConflicts(val, trainerFrom, trainerTo);
  };

  const handleFromDateChange = (val: string) => {
    setTrainerFrom(val);
    checkTrainerConflicts(selectedTrainerId, val, trainerTo);
  };

  const handleToDateChange = (val: string) => {
    setTrainerTo(val);
    checkTrainerConflicts(selectedTrainerId, trainerFrom, val);
  };

  // Waitlist form state
  const [candidateType, setCandidateType] = useState<'Student' | 'Lead'>(
    'Student',
  );
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState('');

  // Session form state
  const [sessionNumber, setSessionNumber] = useState(
    (sessions.length + 1).toString(),
  );
  const [sessionTitleEnglish, setSessionTitleEnglish] = useState('');
  const [sessionTitleArabic, setSessionTitleArabic] = useState('');
  const [sessionDate, setSessionDate] = useState(batchStartDate.split('T')[0]);
  const [sessionStartTime, setSessionStartTime] = useState('09:00');
  const [sessionEndTime, setSessionEndTime] = useState('12:00');
  const [sessionClassroomId, setSessionClassroomId] = useState('');
  const [sessionTrainerId, setSessionTrainerId] = useState('');

  // Handle Session scheduling
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTitleEnglish) {
      toast.error('Please enter an English title.');
      return;
    }
    if (!sessionTitleArabic) {
      toast.error('Please enter an Arabic title.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await createSessionAction(batchId, {
          sessionNumber,
          titleEnglish: sessionTitleEnglish,
          titleArabic: sessionTitleArabic,
          sessionDate,
          startTime: sessionStartTime,
          endTime: sessionEndTime,
          classroomId: sessionClassroomId || null,
          trainerId: sessionTrainerId || null,
        });

        if (res && !res.success) {
          toast.error(res.error || 'Failed to schedule session.');
        } else {
          toast.success('Session successfully scheduled!');
          setSessionTitleEnglish('');
          setSessionTitleArabic('');
          setSessionNumber((sessions.length + 2).toString());
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || 'An unexpected error occurred.');
      }
    });
  };

  // Handle Faculty Assignment
  const handleAssignTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainerId) {
      toast.error('Please select a trainer profile.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await assignTrainerAction(batchId, {
          trainerId: selectedTrainerId,
          role: trainerRole,
          assignedFrom: new Date(trainerFrom).toISOString(),
          assignedTo: new Date(trainerTo).toISOString(),
        });

        if (res && !res.success) {
          toast.error(res.error || 'Failed to assign trainer.');
        } else {
          toast.success('Trainer successfully assigned!');
          setSelectedTrainerId('');
          setConflicts([]);
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || 'An unexpected error occurred.');
      }
    });
  };

  const handleUnassignTrainer = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to unassign this trainer from this batch?')) return;
    setUnassigningId(assignmentId);
    startTransition(async () => {
      try {
        const res = await unassignTrainerAction(batchId, assignmentId);
        if (res && !res.success) {
          toast.error(res.error || 'Failed to unassign trainer.');
        } else {
          toast.success('Trainer successfully unassigned!');
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || 'An unexpected error occurred.');
      } finally {
        setUnassigningId('');
      }
    });
  };

  // Handle Waitlist Placement
  const handleAddToWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    const studentId = candidateType === 'Student' ? selectedStudentId : '';
    const leadId = candidateType === 'Lead' ? selectedLeadId : '';

    if (candidateType === 'Student' && !studentId) {
      toast.error('Please select a student profile.');
      return;
    }
    if (candidateType === 'Lead' && !leadId) {
      toast.error('Please select an active lead.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await addToWaitlistAction(batchId, {
          studentId: studentId || null,
          leadId: leadId || null,
        });

        if (res && !res.success) {
          toast.error(res.error || 'Failed to queue waitlist entry.');
        } else {
          toast.success('Candidate successfully added to waitlist queue!');
          setSelectedStudentId('');
          setSelectedLeadId('');
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || 'An unexpected error occurred.');
      }
    });
  };

  // Handle FIFO Promotion
  const handlePromote = (waitlistId: string) => {
    startTransition(async () => {
      try {
        const res = await manualPromoteAction(batchId, waitlistId);
        if (res && !res.success) {
          toast.error(res.error || 'Failed to promote waitlisted student.');
        } else {
          toast.success('Student successfully promoted to active enrollment!');
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || 'An unexpected error occurred.');
      }
    });
  };

  // Handle Skip Candidate
  const handleSkip = (waitlistId: string) => {
    const reason = prompt(
      'Please enter the reason for skipping this candidate:',
    );
    if (!reason || !reason.trim()) {
      toast.error('Skip reason is required.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await skipWaitlistAction(batchId, waitlistId, reason);
        if (res && !res.success) {
          toast.error(res.error || 'Failed to skip candidate.');
        } else {
          toast.success('Candidate successfully skipped (status set to Held).');
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || 'An unexpected error occurred.');
      }
    });
  };

  // Handle Reactivate Candidate
  const handleReactivate = (waitlistId: string) => {
    startTransition(async () => {
      try {
        const res = await reactivateWaitlistAction(batchId, waitlistId);
        if (res && !res.success) {
          toast.error(res.error || 'Failed to reactivate candidate.');
        } else {
          toast.success(
            'Candidate successfully reactivated and appended to queue!',
          );
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || 'An unexpected error occurred.');
      }
    });
  };

  // Handle Remove Candidate
  const handleRemove = (waitlistId: string) => {
    if (
      !confirm(
        'Are you sure you want to remove this candidate from the waitlist?',
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await removeWaitlistAction(batchId, waitlistId);
        if (res && !res.success) {
          toast.error(res.error || 'Failed to remove candidate.');
        } else {
          toast.success('Candidate successfully removed from waitlist.');
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || 'An unexpected error occurred.');
      }
    });
  };

  // Handle Move Position Up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newQueue = [...waitlist];
    const temp = newQueue[index];
    newQueue[index] = newQueue[index - 1];
    newQueue[index - 1] = temp;

    const waitlistIds = newQueue.map((w) => w.id);
    startTransition(async () => {
      try {
        const res = await reorderWaitlistAction(batchId, waitlistIds);
        if (res && !res.success) {
          toast.error(res.error || 'Failed to reorder queue.');
        } else {
          toast.success('Queue order updated successfully!');
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || 'An unexpected error occurred.');
      }
    });
  };

  // Handle Move Position Down
  const handleMoveDown = (index: number) => {
    if (index === waitlist.length - 1) return;
    const newQueue = [...waitlist];
    const temp = newQueue[index];
    newQueue[index] = newQueue[index + 1];
    newQueue[index + 1] = temp;

    const waitlistIds = newQueue.map((w) => w.id);
    startTransition(async () => {
      try {
        const res = await reorderWaitlistAction(batchId, waitlistIds);
        if (res && !res.success) {
          toast.error(res.error || 'Failed to reorder queue.');
        } else {
          toast.success('Queue order updated successfully!');
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || 'An unexpected error occurred.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Tabs Switcher */}
      <div className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-2 flex space-x-2">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 flex justify-center items-center gap-2 ${
            activeTab === 'sessions'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Calendar className="h-4.5 w-4.5" /> Sessions ({sessions.length})
        </button>
        <button
          onClick={() => setActiveTab('trainers')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 flex justify-center items-center gap-2 ${
            activeTab === 'trainers'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users className="h-4.5 w-4.5" /> Faculty ({trainers.length})
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 flex justify-center items-center gap-2 ${
            activeTab === 'students'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users className="h-4.5 w-4.5" /> Students ({enrolledStudents.length})
        </button>
        {waitingListEnabled && (
          <button
            onClick={() => setActiveTab('waitlist')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 flex justify-center items-center gap-2 ${
              activeTab === 'waitlist'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShieldAlert className="h-4.5 w-4.5" /> Waiting List (
            {waitlist.length})
          </button>
        )}
      </div>

      {/* Tab Panels */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <Card className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-800">
                  Scheduled Sessions
                </h3>
              </div>
              {isCoordinator && trainers.length > 0 && batchStatus !== 'Completed' && batchStatus !== 'Cancelled' && (
                <Link href={`/batches/${batchId}/sessions/new`}>
                  <Button size="sm" className="gap-2">
                    <PlusCircle className="h-4.5 w-4.5" /> Schedule New Session
                  </Button>
                </Link>
              )}
            </div>
            {isCoordinator && trainers.length === 0 && (
              <div className="mb-4 p-4 rounded-xl border border-amber-200 bg-amber-50/50 text-amber-800 flex items-start gap-2.5 text-sm">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Faculty Assignment Required:</span> No trainers have been assigned to this batch yet. Please assign a trainer on the <span className="font-medium underline cursor-pointer hover:text-amber-900" onClick={() => setActiveTab('trainers')}>Faculty tab</span> before scheduling sessions.
                </div>
              </div>
            )}
            {sessions.length === 0 ? (
              <div className="p-8 text-center text-sm text-[color:var(--ims-muted)]">
                No sessions scheduled for this batch yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Num</TableHead>
                    <TableHead>Session Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time Range</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Attendance</TableHead>
                    {isCoordinator && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s) => {
                    const attendanceSession = attendanceSessions.find(
                      (item) => item.sessionId === s.id,
                    );

                    return (
                      <TableRow
                        key={s.id}
                        className={getSessionScheduleTone(s)}
                      >
                        <TableCell className="font-semibold text-slate-600">
                          #{s.sessionNumber}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-800">
                            {s.titleEnglish}
                          </div>
                          <div className="text-xs font-arabic text-slate-400">
                            {s.titleArabic}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(s.sessionDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {s.startTime} - {s.endTime}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <Badge
                              variant={
                                s.status === 'Scheduled'
                                  ? 'info'
                                  : s.status === 'Completed'
                                    ? 'success'
                                    : 'outline'
                              }
                            >
                              {s.status}
                            </Badge>
                            <div>{getScheduleStatusBadge(s)}</div>
                            {s.conflictType && (
                              <div className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--ims-muted)]">
                                {s.conflictType.split('_').join(' ')}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {attendanceSession ? (
                            <div className="inline-flex items-center gap-2">
                              <Badge variant="success">Opened</Badge>
                              {attendanceSession.records.length === 0 ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isPending}
                                  onClick={() => {
                                    startTransition(async () => {
                                      try {
                                        const res =
                                          await openAttendanceSessionAction(
                                            s.id,
                                          );
                                        if (res && !res.success) {
                                          toast.error(
                                            res.error ||
                                              'Failed to generate attendance roster.',
                                          );
                                          return;
                                        }
                                        toast.success(
                                          'Attendance roster generated.',
                                        );
                                        router.refresh();
                                      } catch (err: any) {
                                        toast.error(
                                          err.message ||
                                            'An unexpected error occurred.',
                                        );
                                      }
                                    });
                                  }}
                                  className="gap-2"
                                >
                                  {isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <ClipboardList className="h-4 w-4" />
                                  )}
                                  Generate Roster
                                </Button>
                              ) : (
                                <Link
                                  href="/attendance/sessions"
                                  className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--ims-brass)] hover:underline"
                                >
                                  <ClipboardList className="h-3.5 w-3.5" />
                                  View
                                </Link>
                              )}
                            </div>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              onClick={() => {
                                startTransition(async () => {
                                  try {
                                    const res =
                                      await openAttendanceSessionAction(s.id);
                                    if (res && !res.success) {
                                      toast.error(
                                        res.error ||
                                          'Failed to open attendance session.',
                                      );
                                      return;
                                    }
                                    toast.success(
                                      'Attendance session opened and roster generated.',
                                    );
                                    router.refresh();
                                    router.push('/attendance/sessions');
                                  } catch (err: any) {
                                    toast.error(
                                      err.message ||
                                        'An unexpected error occurred.',
                                    );
                                  }
                                });
                              }}
                              className="gap-2"
                            >
                              {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ClipboardList className="h-4 w-4" />
                              )}
                              Open Attendance
                            </Button>
                          )}
                        </TableCell>
                         {isCoordinator && s.status !== 'Completed' && batchStatus !== 'Completed' && batchStatus !== 'Cancelled' && (
                          <TableCell className="text-right">
                            <Link href={`/batches/${batchId}/sessions/${s.id}/edit`}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                title="Edit Session"
                              >
                                <Edit className="h-4.5 w-4.5 text-indigo-600" />
                              </Button>
                            </Link>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'trainers' && (
        <div className="space-y-6">
          {/* Faculty list */}
          <Card className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-800">
                  Faculty Assignments
                </h3>
              </div>
              {isCoordinator && batchStatus !== 'Completed' && batchStatus !== 'Cancelled' && (
                <Link href={`/batches/${batchId}/faculty`}>
                  <Button variant="outline" size="sm" className="text-xs">
                    Manage Assignments
                  </Button>
                </Link>
              )}
            </div>
            {trainers.length === 0 ? (
              <div className="p-8 text-center text-sm text-[color:var(--ims-muted)]">
                No trainers have been assigned to this batch yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trainer</TableHead>
                    <TableHead>Code & Type</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned From</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    {isCoordinator && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainers.map((t) => {
                    const detail = trainersList.find((ut) => ut.id === t.trainerId);
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div className="font-semibold text-slate-800">
                            {detail ? detail.displayName : 'Unknown Trainer'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {detail ? detail.email : t.trainerId}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <div className="font-semibold">{detail ? detail.trainerCode : 'N/A'}</div>
                          <div className="text-[10px] text-slate-400 font-sans">{detail ? detail.trainerType : 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              t.role === 'Primary' ? 'default' : 'outline'
                            }
                          >
                            {t.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(t.assignedFrom).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(t.assignedTo).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{t.status}</TableCell>
                         {isCoordinator && batchStatus !== 'Completed' && batchStatus !== 'Cancelled' && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold"
                              disabled={isPending || unassigningId === t.id}
                              onClick={() => handleUnassignTrainer(t.id)}
                            >
                              {unassigningId === t.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                'Unassign'
                              )}
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {waitingListEnabled && activeTab === 'waitlist' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Waitlist list */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-semibold text-slate-800">
                    Waiting List Queue
                  </h3>
                </div>
                <Badge
                  variant="outline"
                  className="bg-indigo-50 text-indigo-700 border-indigo-200"
                >
                  Total Active:{' '}
                  {waitlist.filter((w) => w.status === 'Waiting').length}
                </Badge>
              </div>
              {waitlist.length === 0 ? (
                <div className="p-8 text-center text-sm text-[color:var(--ims-muted)]">
                  Waiting list queue is currently empty.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Queue Pos</TableHead>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details / Reason</TableHead>
                       {isRegistrar && batchStatus !== 'Completed' && batchStatus !== 'Cancelled' && (
                        <TableHead className="text-right">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waitlist.map((w, index) => {
                      let displayName = '-';
                      let typeLabel = '-';
                      const studentId = w.studentProfileId || w.studentId;
                      if (studentId) {
                        const student = studentsList.find(
                          (s) => s.id === studentId,
                        );
                        displayName = student
                          ? `${student.firstName} ${student.lastName}`
                          : 'Unknown Student';
                        typeLabel = 'Student Profile';
                      } else if (w.leadId) {
                        const lead = leadsList.find((l) => l.id === w.leadId);
                        displayName = lead
                          ? `${lead.firstName} ${lead.lastName}`
                          : 'Unknown Lead';
                        typeLabel = `CRM Lead (${lead?.leadNumber ?? ''})`;
                      }

                      return (
                        <TableRow key={w.id}>
                          <TableCell className="font-semibold text-slate-700">
                            {w.status === 'Waiting'
                              ? `#${w.queuePosition}`
                              : '-'}
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">
                            {displayName}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {typeLabel}
                          </TableCell>
                          <TableCell>
                            {w.status === 'Waiting' && (
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200"
                              >
                                Waiting
                              </Badge>
                            )}
                            {w.status === 'Promoted' && (
                              <Badge variant="success">Promoted</Badge>
                            )}
                            {w.status === 'Held' && (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-700 border-amber-200"
                              >
                                Held
                              </Badge>
                            )}
                            {w.status === 'Suspended' && (
                              <Badge variant="error">Suspended</Badge>
                            )}
                            {w.status === 'Removed' && (
                              <Badge
                                variant="outline"
                                className="bg-slate-100 text-slate-500 border-slate-200"
                              >
                                Removed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell
                            className="text-xs text-slate-500 max-w-[150px] truncate"
                            title={w.statusReason || ''}
                          >
                            {w.statusReason || '-'}
                          </TableCell>
                          {isRegistrar && batchStatus !== 'Completed' && batchStatus !== 'Cancelled' && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Reorder Actions */}
                                {w.status === 'Waiting' && (
                                  <>
                                    <Button
                                      onClick={() => handleMoveUp(index)}
                                      disabled={
                                        index === 0 ||
                                        isPending ||
                                        waitlist[index - 1]?.status !==
                                          'Waiting'
                                      }
                                      size="sm"
                                      variant="ghost"
                                      className="p-1 h-7 w-7 text-slate-400 hover:text-slate-700"
                                      title="Move Up"
                                    >
                                      <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      onClick={() => handleMoveDown(index)}
                                      disabled={
                                        index === waitlist.length - 1 ||
                                        isPending ||
                                        waitlist[index + 1]?.status !==
                                          'Waiting'
                                      }
                                      size="sm"
                                      variant="ghost"
                                      className="p-1 h-7 w-7 text-slate-400 hover:text-slate-700"
                                      title="Move Down"
                                    >
                                      <ArrowDown className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}

                                {/* Operation Actions */}
                                {w.status === 'Waiting' && (
                                  <>
                                    <Button
                                      onClick={() => handlePromote(w.id)}
                                      disabled={isPending}
                                      size="sm"
                                      variant="outline"
                                      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 text-xs px-2.5 py-1 h-7"
                                      title="Promote Manual"
                                    >
                                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                      Promote
                                    </Button>
                                    <Button
                                      onClick={() => handleSkip(w.id)}
                                      disabled={isPending}
                                      size="sm"
                                      variant="outline"
                                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200 text-xs px-2.5 py-1 h-7"
                                      title="Skip Candidate"
                                    >
                                      <CircleSlash className="h-3.5 w-3.5 mr-1" />
                                      Skip
                                    </Button>
                                  </>
                                )}

                                {(w.status === 'Held' ||
                                  w.status === 'Suspended') && (
                                  <Button
                                    onClick={() => handleReactivate(w.id)}
                                    disabled={isPending}
                                    size="sm"
                                    variant="outline"
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 text-xs px-2.5 py-1 h-7"
                                    title="Reactivate"
                                  >
                                    <PlayCircle className="h-3.5 w-3.5 mr-1" />
                                    Reactivate
                                  </Button>
                                )}

                                {w.status !== 'Removed' &&
                                  w.status !== 'Promoted' && (
                                    <Button
                                      onClick={() => handleRemove(w.id)}
                                      disabled={isPending}
                                      size="sm"
                                      variant="ghost"
                                      className="p-1 h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                      title="Remove Candidate"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>

          {/* Inline Waitlist placement form */}
          <div>
            {isRegistrar && batchStatus !== 'Completed' && batchStatus !== 'Cancelled' && (
              <Card className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Bookmark className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-semibold text-slate-800">
                    Queue Candidate
                  </h3>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setCandidateType('Student')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${
                      candidateType === 'Student'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    Student Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setCandidateType('Lead')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${
                      candidateType === 'Lead'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    Active Lead
                  </button>
                </div>

                <form onSubmit={handleAddToWaitlist} className="space-y-4">
                  {candidateType === 'Student' ? (
                    <FormField>
                      <FormLabel required>Select Student Profile</FormLabel>
                      <FormControl>
                        <Select
                          placeholder="Select Student"
                          value={selectedStudentId}
                          onChange={(e) => setSelectedStudentId(e.target.value)}
                          options={studentsList.map((s) => ({
                            value: s.id,
                            label: `${s.firstName} ${s.lastName} (${s.email})`,
                          }))}
                        />
                      </FormControl>
                    </FormField>
                  ) : (
                    <FormField>
                      <FormLabel required>Select Active CRM Lead</FormLabel>
                      <FormControl>
                        <Select
                          placeholder="Select Lead"
                          value={selectedLeadId}
                          onChange={(e) => setSelectedLeadId(e.target.value)}
                          options={leadsList.map((l) => ({
                            value: l.id,
                            label: `${l.firstName} ${l.lastName} (#${l.leadNumber})`,
                          }))}
                        />
                      </FormControl>
                    </FormField>
                  )}

                  <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full mt-2"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Queue Candidate'
                    )}
                  </Button>
                </form>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <Card className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
            <Users className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-800">
              Enrolled Students Roster
            </h3>
          </div>
          {enrolledStudents.length === 0 ? (
            <div className="p-8 text-center text-sm text-[color:var(--ims-muted)]">
              No students are currently enrolled in this batch.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Number</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Enrollment Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrolledStudents.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs font-semibold text-slate-600">
                      {s.studentNumber}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      <Link
                        href={`/admissions?q=${s.studentNumber}`}
                        className="text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        {s.firstName} {s.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>{s.mobile}</TableCell>
                    <TableCell>
                      {new Date(s.enrollmentDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.status === 'Active'
                            ? 'success'
                            : s.status === 'Confirmed'
                              ? 'info'
                              : 'outline'
                        }
                      >
                        {s.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
