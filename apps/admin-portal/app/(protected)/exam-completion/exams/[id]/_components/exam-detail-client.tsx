'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PageHeader,
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
  CardContent,
  CardFooter,
  Badge,
  Button,
  LinkButton,
  EmptyState,
  Input,
  Textarea,
  Breadcrumbs,
} from '@ims/shared-ui';
import {
  Home,
  Layers,
  Calendar,
  ClipboardList,
  CheckSquare,
  Trash2,
  PlayCircle,
  UploadCloud,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

interface ExamDetailClientProps {
  exam: any;
  results: any[];
  resultStats: {
    total: number;
    recorded: number;
    finalized: number;
    pending: number;
  };
  permissions: string[];
}

function hasPermission(permissions: string[], code: string): boolean {
  return permissions.includes(code) || permissions.includes('SUPER_ADMIN');
}

export function ExamDetailClient({
  exam,
  results: initialResults,
  resultStats,
  permissions,
}: ExamDetailClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Local state for marks editing roster
  const [localMarks, setLocalMarks] = useState<
    Record<string, { marksObtained: string; grade: string }>
  >(() => {
    const initial: Record<string, { marksObtained: string; grade: string }> =
      {};
    initialResults.forEach((r) => {
      if (r.resultStatus !== 'Finalized') {
        initial[r.enrollmentId] = {
          marksObtained: r.marksObtained.toString(),
          grade: r.grade || '',
        };
      }
    });
    return initial;
  });

  // Correction Dialog States
  const [correctionResult, setCorrectionResult] = useState<any | null>(null);
  const [correctedMarks, setCorrectedMarks] = useState('');
  const [correctedGrade, setCorrectedGrade] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  const canUpdate = hasPermission(permissions, 'exam.update');
  const canCreateResult = hasPermission(permissions, 'result.create');
  const canFinalizeResult = hasPermission(permissions, 'result.finalize');
  const canCorrectResult = hasPermission(permissions, 'result.correct');

  const isRosterEditable =
    exam.status === 'OpenForResultEntry' && canCreateResult;

  const handleAction = async (action: string) => {
    setLoading(action);
    const toastId = toast.loading(`Performing action: ${action}...`);
    try {
      const res = await fetch(`/api/v1/exams/${exam.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:
          action === 'cancel'
            ? JSON.stringify({ reason: 'Cancelled via UI' })
            : JSON.stringify({}),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Exam ${action} successful!`, { id: toastId });
        router.refresh();
      } else {
        throw new Error(data.messageEnglish || 'Action failed');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Action failed', { id: toastId });
    } finally {
      setLoading(null);
    }
  };

  // Open Draft exam for results in single step (Chained schedule + activate)
  const handleOpenForResults = async () => {
    setLoading('open-results');
    const toastId = toast.loading('Opening exam for results...');
    try {
      // 1. Schedule exam
      let res = await fetch(`/api/v1/exams/${exam.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.messageEnglish || 'Failed to schedule exam.');
      }

      // 2. Activate exam (OpenForResultEntry)
      res = await fetch(`/api/v1/exams/${exam.id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.messageEnglish || 'Failed to open exam for results.');
      }

      toast.success('Exam opened for results entry!', { id: toastId });
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Action failed', { id: toastId });
    } finally {
      setLoading(null);
    }
  };

  // Inline Roster Marks Input change handler
  const handleInputChange = (
    enrollmentId: string,
    field: 'marksObtained' | 'grade',
    value: string,
  ) => {
    setLocalMarks((prev) => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        [field]: value,
      },
    }));
  };

  // Bulk Save Roster marks (records or updates Draft results)
  const handleSaveRoster = async () => {
    // Validate inputs locally
    const validRows: Array<{
      enrollmentId: string;
      marksObtained: number;
      grade?: string;
    }> = [];

    for (const [enrollmentId, values] of Object.entries(localMarks)) {
      const marks = parseFloat(values.marksObtained);
      if (isNaN(marks) || marks < 0) {
        toast.error('All marks must be valid numbers greater than or equal to 0.');
        return;
      }
      if (marks > exam.maxMarks) {
        toast.error(`Marks cannot exceed the exam's maximum allowed limit (${exam.maxMarks}).`);
        return;
      }
      validRows.push({
        enrollmentId,
        marksObtained: marks,
        grade: values.grade.trim() || undefined,
      });
    }

    if (validRows.length === 0) {
      toast.error('No pending results to save.');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Saving results roster...');

    try {
      const response = await fetch('/api/v1/results/bulk/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: exam.id,
          results: validRows,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.messageEnglish || data.message || 'Failed to save roster results.',
        );
      }

      toast.success('Results roster recorded successfully!', { id: toastId });
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save roster results.', {
        id: toastId,
      });
    } finally {
      setSaving(false);
    }
  };

  // Finalize Result Action
  const handleFinalize = async (resultId: string) => {
    if (resultId.startsWith('temp-')) {
      toast.error('Please save the roster marks first before finalizing.');
      return;
    }

    setLoading(`finalize-${resultId}`);
    const toastId = toast.loading('Finalizing result...');

    try {
      const response = await fetch(`/api/v1/results/${resultId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.messageEnglish || data.message || 'Failed to finalize result.',
        );
      }

      toast.success('Result finalized successfully!', { id: toastId });
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to finalize result.', { id: toastId });
    } finally {
      setLoading(null);
    }
  };

  // Open Correction Dialog
  const openCorrection = (result: any) => {
    setCorrectionResult(result);
    setCorrectedMarks(result.marksObtained.toString());
    setCorrectedGrade(result.grade || '');
    setCorrectionReason('');
  };

  // Submit Correction Action
  const handleCorrectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionResult) return;

    if (!correctedMarks || parseFloat(correctedMarks) < 0) {
      toast.error('Please enter valid marks.');
      return;
    }
    if (parseFloat(correctedMarks) > exam.maxMarks) {
      toast.error(`Marks cannot exceed exam max marks (${exam.maxMarks}).`);
      return;
    }
    if (correctionReason.trim().length < 10) {
      toast.error('Correction reason must be at least 10 characters.');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Applying correction...');

    try {
      const response = await fetch(
        `/api/v1/results/${correctionResult.id}/correct`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            marksObtained: parseFloat(correctedMarks),
            grade: correctedGrade.trim() || undefined,
            reason: correctionReason.trim(),
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.messageEnglish || data.message || 'Failed to correct result.',
        );
      }

      toast.success('Result corrected successfully!', { id: toastId });
      setCorrectionResult(null);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to correct result.', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      'muted' | 'info' | 'warning' | 'success' | 'error' | 'outline'
    > = {
      Draft: 'muted',
      Scheduled: 'info',
      OpenForResultEntry: 'warning',
      Closed: 'success',
      Cancelled: 'error',
      Archived: 'outline',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {status === 'OpenForResultEntry' ? 'Open for Entry' : status}
      </Badge>
    );
  };

  const getResultStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'muted'> = {
      Finalized: 'success',
      Recorded: 'warning',
      Corrected: 'info',
      Pending: 'muted',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Exam Details"
        title={exam.examName}
        description={`${exam.course.nameEnglish} • ${exam.batch.batchNameEnglish}`}
        backUrl="/exam-completion/exams"
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Dashboard',
                href: '/dashboard',
                icon: <Home className="h-3.5 w-3.5" />,
              },
              {
                label: 'Exams',
                href: '/exam-completion/exams',
                icon: <Layers className="h-3.5 w-3.5" />,
              },
              {
                label: exam.examName,
                icon: <Calendar className="h-3.5 w-3.5" />,
              },
            ]}
          />
        }
        actions={
          <div className="flex items-center gap-2">
            {canUpdate && (
              <>
                {exam.status === 'Draft' && (
                  <Button
                    onClick={handleOpenForResults}
                    disabled={loading !== null}
                    variant="primary"
                    className="gap-2"
                  >
                    <PlayCircle className="h-4 w-4" />
                    {loading === 'open-results' ? 'Opening...' : 'Open for Results'}
                  </Button>
                )}
                {exam.status === 'Scheduled' && (
                  <Button
                    onClick={() => handleAction('activate')}
                    disabled={loading !== null}
                    variant="primary"
                    className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                  >
                    <PlayCircle className="h-4 w-4" />
                    {loading === 'activate' ? 'Opening...' : 'Open for Results'}
                  </Button>
                )}
                {exam.status === 'OpenForResultEntry' && (
                  <Button
                    onClick={() => handleAction('close')}
                    disabled={loading !== null}
                    variant="primary"
                    className="bg-slate-700 hover:bg-slate-800 gap-2"
                  >
                    <CheckSquare className="h-4 w-4" />
                    {loading === 'close' ? 'Completing...' : 'Complete Exam'}
                  </Button>
                )}
                {['Draft', 'Scheduled', 'OpenForResultEntry'].includes(
                  exam.status,
                ) && (
                  <Button
                    onClick={() => handleAction('cancel')}
                    disabled={loading !== null}
                    variant="outline"
                    className="border-rose-200 text-rose-600 hover:bg-rose-50 gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {loading === 'cancel' ? 'Cancelling...' : 'Cancel'}
                  </Button>
                )}
                {['Closed', 'Cancelled'].includes(exam.status) && (
                  <Button
                    onClick={() => handleAction('archive')}
                    disabled={loading !== null}
                    variant="outline"
                    className="gap-2"
                  >
                    <Layers className="h-4 w-4" />
                    {loading === 'archive' ? 'Archiving...' : 'Archive'}
                  </Button>
                )}
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white">
          <CardHeader className="pb-2 p-4">
            <CardDescription className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">
              Status
            </CardDescription>
            <div className="mt-2">{getStatusBadge(exam.status)}</div>
          </CardHeader>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2 p-4">
            <CardDescription className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">
              Exam Date
            </CardDescription>
            <CardTitle className="text-xl font-bold mt-2 text-[color:var(--ims-ink)]">
              {new Date(exam.examDate).toLocaleDateString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2 p-4">
            <CardDescription className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">
              Passing Standard
            </CardDescription>
            <CardTitle className="text-xl font-bold mt-2 text-[color:var(--ims-ink)]">
              {exam.passMarks} / {exam.maxMarks}{' '}
              <span className="text-xs font-normal text-slate-500">marks</span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2 p-4">
            <CardDescription className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">
              Roster Entries
            </CardDescription>
            <CardTitle className="text-xl font-bold mt-2 text-[color:var(--ims-ink)]">
              {resultStats.finalized} / {resultStats.total}{' '}
              <span className="text-xs font-normal text-slate-500">
                finalized
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>



      {/* Roster & Results Card */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Results Roster</CardTitle>
          <CardDescription>
            {isRosterEditable
              ? 'Input student grades directly and click "Save Roster Marks" to save draft changes.'
              : 'Roster of students and recorded grades for this scheduled assessment.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {initialResults.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No students enrolled"
                description="There are no active student enrollments in this batch."
                icon={<ClipboardList className="h-10 w-10 text-[color:var(--ims-muted)]" />}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/75">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Student
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Enrollment #
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 w-[180px]">
                      Marks
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 w-[140px]">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500 w-[220px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {initialResults.map((r) => {
                    const isRowFinalized = r.resultStatus === 'Finalized';
                    const isEditable = isRosterEditable && !isRowFinalized;
                    const marksValue = isEditable
                      ? localMarks[r.enrollmentId]?.marksObtained
                      : r.marksObtained.toString();
                    const gradeValue = isEditable
                      ? localMarks[r.enrollmentId]?.grade
                      : r.grade || '-';

                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-800">
                          {r.enrollment.studentProfile?.person?.firstName}{' '}
                          {r.enrollment.studentProfile?.person?.lastName}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-mono text-slate-500">
                          {r.enrollment.enrollmentNumber}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          {isEditable ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max={exam.maxMarks}
                                step="any"
                                value={marksValue}
                                onChange={(e) =>
                                  handleInputChange(
                                    r.enrollmentId,
                                    'marksObtained',
                                    e.target.value,
                                  )
                                }
                                disabled={saving}
                                className="w-24 h-9 rounded-lg border border-slate-200 px-2 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
                                required
                              />
                              <span className="text-xs text-slate-400 font-medium">
                                / {exam.maxMarks}
                              </span>
                            </div>
                          ) : (
                            <span className="font-semibold text-slate-700">
                              {r.resultStatus === 'Pending'
                                ? '-'
                                : `${r.marksObtained} / ${exam.maxMarks}`}
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          {getResultStatusBadge(r.resultStatus)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                          <div className="inline-flex justify-end gap-2 w-full">
                            {/* Finalize Button */}
                            {!isRowFinalized &&
                              ['Recorded', 'Corrected'].includes(
                                r.resultStatus,
                              ) &&
                              canFinalizeResult && (
                                <Button
                                  onClick={() => handleFinalize(r.id)}
                                  disabled={loading !== null}
                                  variant="primary"
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs px-2.5"
                                >
                                  {loading === `finalize-${r.id}`
                                    ? 'Finalizing...'
                                    : 'Finalize'}
                                </Button>
                              )}
                            {/* Correction Button */}
                            {isRowFinalized && canCorrectResult && (
                              <Button
                                onClick={() => openCorrection(r)}
                                disabled={saving}
                                variant="outline"
                                size="sm"
                                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 h-8 text-xs px-2.5"
                              >
                                Correct Marks
                              </Button>
                            )}
                            {!isEditable &&
                              !isRowFinalized &&
                              r.resultStatus === 'Pending' && (
                                <span className="text-xs text-slate-400 font-medium italic">
                                  Pending entry
                                </span>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roster Save Floating Action Bar */}
      {isRosterEditable && initialResults.length > 0 && (
        <div className="flex items-center justify-end gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">
            Roster marks will be saved as Draft scores.
          </p>
          <Button
            onClick={handleSaveRoster}
            disabled={saving}
            variant="primary"
            className="gap-2 shadow-lg shadow-blue-100"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Roster Marks'}
          </Button>
        </div>
      )}

      {/* Correction Modal Dialog */}
      {correctionResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md bg-white border border-slate-100 shadow-xl animate-in fade-in zoom-in-95 duration-150 p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle>Correct Exam Result</CardTitle>
              <CardDescription>
                Correcting marks for{' '}
                <span className="font-semibold text-slate-800">
                  {correctionResult.enrollment.studentProfile?.person?.firstName}{' '}
                  {correctionResult.enrollment.studentProfile?.person?.lastName}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <form onSubmit={handleCorrectSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Input
                    label="Corrected Marks"
                    type="number"
                    min="0"
                    max={correctionResult.exam.maxMarks}
                    step="any"
                    value={correctedMarks}
                    onChange={(e) => setCorrectedMarks(e.target.value)}
                    required
                  />
                  <p className="text-[10px] text-slate-400 font-medium text-right mt-1">
                    / {correctionResult.exam.maxMarks} max
                  </p>
                </div>

                <div className="space-y-1">
                  <Textarea
                    label="Correction Reason (min. 10 chars)"
                    rows={3}
                    placeholder="Explain why this correction is being performed..."
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <Button
                    type="button"
                    onClick={() => setCorrectionResult(null)}
                    disabled={saving}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving} variant="primary">
                    Apply Correction
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
