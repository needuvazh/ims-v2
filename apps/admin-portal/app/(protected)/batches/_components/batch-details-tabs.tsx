'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { assignTrainerAction, addToWaitlistAction, manualPromoteAction, createSessionAction } from '../actions';

interface BatchDetailsTabsProps {
  batchId: string;
  batchStartDate: string;
  batchEndDate: string;
  sessions: any[];
  trainers: any[];
  waitlist: any[];
  trainersList: any[];
  studentsList: any[];
  leadsList: any[];
  classroomsList: any[];
  isRegistrar: boolean;
  isCoordinator: boolean;
}

export function BatchDetailsTabs({
  batchId,
  batchStartDate,
  batchEndDate,
  sessions,
  trainers,
  waitlist,
  trainersList,
  studentsList,
  leadsList,
  classroomsList,
  isRegistrar,
  isCoordinator,
}: BatchDetailsTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'sessions' | 'trainers' | 'waitlist'>('sessions');
  const [isPending, startTransition] = useTransition();

  // Trainer form state
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [trainerRole, setTrainerRole] = useState<'Primary' | 'Assistant' | 'Observer'>('Primary');
  const [trainerFrom, setTrainerFrom] = useState(batchStartDate.split('T')[0]);
  const [trainerTo, setTrainerTo] = useState(batchEndDate.split('T')[0]);

  // Trainer Conflicts
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  const checkTrainerConflicts = async (trainerId: string, fromDate: string, toDate: string) => {
    if (!trainerId) {
      setConflicts([]);
      return;
    }
    setCheckingConflicts(true);
    try {
      const res = await fetch(
        `/api/v1/batches/${batchId}/trainers/conflicts?trainerId=${trainerId}&assignedFrom=${fromDate}&assignedTo=${toDate}`
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
  const [candidateType, setCandidateType] = useState<'Student' | 'Lead'>('Student');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState('');

  // Session form state
  const [sessionNumber, setSessionNumber] = useState((sessions.length + 1).toString());
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
  const handlePromote = (candidateId: string) => {
    startTransition(async () => {
      try {
        const res = await manualPromoteAction(batchId, candidateId);
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

  return (
    <div className="space-y-6">
      {/* Tabs Switcher */}
      <div className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-2 flex space-x-2">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 flex justify-center items-center gap-2 ${
            activeTab === 'sessions' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Calendar className="h-4.5 w-4.5" /> Sessions ({sessions.length})
        </button>
        <button
          onClick={() => setActiveTab('trainers')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 flex justify-center items-center gap-2 ${
            activeTab === 'trainers' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users className="h-4.5 w-4.5" /> Faculty ({trainers.length})
        </button>
        <button
          onClick={() => setActiveTab('waitlist')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 flex justify-center items-center gap-2 ${
            activeTab === 'waitlist' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ShieldAlert className="h-4.5 w-4.5" /> Waiting List ({waitlist.length})
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'sessions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <Calendar className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-800">Scheduled Sessions</h3>
              </div>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-semibold text-slate-600">#{s.sessionNumber}</TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-800">{s.titleEnglish}</div>
                          <div className="text-xs font-arabic text-slate-400">{s.titleArabic}</div>
                        </TableCell>
                        <TableCell>{new Date(s.sessionDate).toLocaleDateString()}</TableCell>
                        <TableCell className="font-mono text-xs">{s.startTime} - {s.endTime}</TableCell>
                        <TableCell>
                          <Badge variant={s.status === 'Scheduled' ? 'info' : s.status === 'Completed' ? 'success' : 'outline'}>
                            {s.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>

          {/* Schedule Session Form */}
          <div>
            {isCoordinator && (
              <Card className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <PlusCircle className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-semibold text-slate-800">Schedule Session</h3>
                </div>
                <form onSubmit={handleCreateSession} className="space-y-4">
                  <FormField>
                    <FormLabel required>Session Number</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        value={sessionNumber}
                        onChange={(e) => setSessionNumber(e.target.value)}
                      />
                    </FormControl>
                  </FormField>

                  <FormField>
                    <FormLabel required>Title (English)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Introduction to DDD"
                        value={sessionTitleEnglish}
                        onChange={(e) => setSessionTitleEnglish(e.target.value)}
                      />
                    </FormControl>
                  </FormField>

                  <FormField>
                    <FormLabel required>Title (Arabic)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. مقدمة في تصميم النطاق"
                        value={sessionTitleArabic}
                        onChange={(e) => setSessionTitleArabic(e.target.value)}
                        className="text-right"
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
                      />
                    </FormControl>
                  </FormField>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField>
                      <FormLabel required>Start Time</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          value={sessionStartTime}
                          onChange={(e) => setSessionStartTime(e.target.value)}
                        />
                      </FormControl>
                    </FormField>
                    <FormField>
                      <FormLabel required>End Time</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          value={sessionEndTime}
                          onChange={(e) => setSessionEndTime(e.target.value)}
                        />
                      </FormControl>
                    </FormField>
                  </div>

                  <FormField>
                    <FormLabel>Trainer Assignment (Optional)</FormLabel>
                    <FormControl>
                      <Select
                        placeholder="Assign Trainer"
                        value={sessionTrainerId}
                        onChange={(e) => setSessionTrainerId(e.target.value)}
                        options={trainersList.map((t: any) => ({ value: t.id, label: t.displayName }))}
                      />
                    </FormControl>
                  </FormField>

                  <FormField>
                    <FormLabel>Classroom Booking (Optional)</FormLabel>
                    <FormControl>
                      <Select
                        placeholder="Book Classroom"
                        value={sessionClassroomId}
                        onChange={(e) => setSessionClassroomId(e.target.value)}
                        options={classroomsList.map((c: any) => ({ value: c.id, label: c.classroomName }))}
                      />
                    </FormControl>
                  </FormField>

                  <Button type="submit" disabled={isPending} className="w-full mt-2">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Schedule Session'}
                  </Button>
                </form>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === 'trainers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Faculty list */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <Users className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-800">Faculty Assignments</h3>
              </div>
              {trainers.length === 0 ? (
                <div className="p-8 text-center text-sm text-[color:var(--ims-muted)]">
                  No trainers have been assigned to this batch yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trainer ID</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Assigned From</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trainers.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs text-slate-600">{t.trainerId}</TableCell>
                        <TableCell>
                          <Badge variant={t.role === 'Primary' ? 'default' : 'outline'}>{t.role}</Badge>
                        </TableCell>
                        <TableCell>{new Date(t.assignedFrom).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(t.assignedTo).toLocaleDateString()}</TableCell>
                        <TableCell>{t.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>

          {/* Inline Assignment Form */}
          <div>
            {isCoordinator && (
              <Card className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <PlusCircle className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-semibold text-slate-800">Assign Faculty</h3>
                </div>
                <form onSubmit={handleAssignTrainer} className="space-y-4">
                  <FormField>
                    <FormLabel required>Select Trainer</FormLabel>
                    <FormControl>
                      <Select
                        placeholder="Select Trainer Profile"
                        value={selectedTrainerId}
                        onChange={(e) => handleTrainerChange(e.target.value)}
                        options={trainersList.map((t) => ({ value: t.id, label: `${t.displayName} (${t.email})` }))}
                      />
                    </FormControl>
                  </FormField>

                  <FormField>
                    <FormLabel required>Role Type</FormLabel>
                    <FormControl>
                      <select
                        value={trainerRole}
                        onChange={(e) => setTrainerRole(e.target.value as any)}
                        className="flex h-10 w-full rounded-md border border-[color:var(--ims-border)] bg-[color:var(--ims-card)] px-3 py-2 text-sm focus-visible:outline-none"
                      >
                        <option value="Primary">Primary Trainer</option>
                        <option value="Assistant">Assistant Trainer</option>
                        <option value="Observer">Observer</option>
                      </select>
                    </FormControl>
                  </FormField>

                  <FormField>
                    <FormLabel required>Assigned From</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={trainerFrom}
                        onChange={(e) => handleFromDateChange(e.target.value)}
                      />
                    </FormControl>
                  </FormField>

                  <FormField>
                    <FormLabel required>Assigned To</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={trainerTo}
                        onChange={(e) => handleToDateChange(e.target.value)}
                      />
                    </FormControl>
                  </FormField>

                  {checkingConflicts && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Checking schedule conflicts...</span>
                    </div>
                  )}

                  {conflicts.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
                        Trainer has schedule conflicts in the following batches:
                      </div>
                      <div className="border border-red-100 bg-red-50/20 rounded-lg overflow-hidden text-[10px]">
                        <table className="min-w-full divide-y divide-red-100">
                          <thead className="bg-red-50 text-red-700">
                            <tr>
                              <th className="px-3 py-1.5 text-left font-semibold">Batch</th>
                              <th className="px-3 py-1.5 text-left font-semibold">Date</th>
                              <th className="px-3 py-1.5 text-left font-semibold">Start</th>
                              <th className="px-3 py-1.5 text-left font-semibold">End</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-red-100 text-slate-600">
                            {conflicts.map((c, idx) => (
                              <tr key={idx}>
                                <td className="px-3 py-1.5 font-mono font-bold">{c.batchCode}</td>
                                <td className="px-3 py-1.5">{new Date(c.sessionDate).toLocaleDateString()}</td>
                                <td className="px-3 py-1.5">{c.startTime}</td>
                                <td className="px-3 py-1.5">{c.endTime}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <Button type="submit" disabled={isPending || conflicts.length > 0 || checkingConflicts} className="w-full mt-2">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign Faculty'}
                  </Button>
                </form>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === 'waitlist' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Waitlist list */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <ShieldAlert className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-800">Waiting List Queue</h3>
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
                      <TableHead>Student ID</TableHead>
                      <TableHead>Lead ID</TableHead>
                      <TableHead>Status</TableHead>
                      {isRegistrar && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waitlist.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-semibold text-slate-700">#{w.queuePosition}</TableCell>
                        <TableCell className="font-mono text-xs">{w.studentId || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{w.leadId || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={w.status === 'Waiting' ? 'outline' : w.status === 'Promoted' ? 'success' : 'error'}>
                            {w.status}
                          </Badge>
                        </TableCell>
                        {isRegistrar && (
                          <TableCell className="text-right">
                            {w.status === 'Waiting' && (
                              <Button
                                onClick={() => handlePromote(w.id)}
                                disabled={isPending}
                                size="sm"
                                variant="outline"
                              >
                                Promote FIFO
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>

          {/* Inline Waitlist placement form */}
          <div>
            {isRegistrar && (
              <Card className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Bookmark className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-semibold text-slate-800">Queue Candidate</h3>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setCandidateType('Student')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${
                      candidateType === 'Student' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Student Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setCandidateType('Lead')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${
                      candidateType === 'Lead' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
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
                          options={studentsList.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName} (${s.email})` }))}
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
                          options={leadsList.map((l) => ({ value: l.id, label: `${l.firstName} ${l.lastName} (#${l.leadNumber})` }))}
                        />
                      </FormControl>
                    </FormField>
                  )}

                  <Button type="submit" disabled={isPending} className="w-full mt-2">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Queue Candidate'}
                  </Button>
                </form>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
