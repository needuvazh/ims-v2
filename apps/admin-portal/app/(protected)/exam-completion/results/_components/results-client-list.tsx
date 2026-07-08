'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
  CardContent,
  Badge,
  Button,
  LinkButton,
  EmptyState,
  Input,
  Textarea,
} from '@ims/shared-ui';
import {
  UploadCloud,
  CheckCircle,
  Save,
  PlusCircle,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  ClipboardList,
} from 'lucide-react';

interface ResultsClientListProps {
  results: any[];
  exam: {
    id: string;
    maxMarks: number;
    passMarks: number;
    status: string;
  } | null;
  permissions: string[];
}

function hasPermission(permissions: string[], code: string): boolean {
  return permissions.includes(code) || permissions.includes('SUPER_ADMIN');
}

export function ResultsClientList({
  results: initialResults,
  exam,
  permissions,
}: ResultsClientListProps) {
  const router = useRouter();

  // Handle local state for marks editing roster
  const [localMarks, setLocalMarks] = useState<
    Record<string, { marksObtained: string; grade: string }>
  >(() => {
    const initial: Record<string, { marksObtained: string; grade: string }> =
      {};
    initialResults.forEach((r) => {
      // Only default editable fields if the status is not Finalized
      if (r.resultStatus !== 'Finalized') {
        initial[r.enrollmentId] = {
          marksObtained: r.marksObtained.toString(),
          grade: r.grade || '',
        };
      }
    });
    return initial;
  });

  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  // Correction Dialog States
  const [correctionResult, setCorrectionResult] = useState<any | null>(null);
  const [correctedMarks, setCorrectedMarks] = useState('');
  const [correctedGrade, setCorrectedGrade] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  const canCreate = hasPermission(permissions, 'result.create');
  const canFinalize = hasPermission(permissions, 'result.finalize');
  const canCorrect = hasPermission(permissions, 'result.correct');

  // Roster is editable only if exam is in 'OpenForResultEntry' status and user can create results
  const isRosterEditable =
    exam !== null && exam.status === 'OpenForResultEntry' && canCreate;

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
    if (!exam) return;

    // Validate inputs locally
    const validRows: Array<{
      enrollmentId: string;
      marksObtained: number;
      grade?: string;
    }> = [];
    for (const [enrollmentId, values] of Object.entries(localMarks)) {
      const marks = parseFloat(values.marksObtained);
      if (isNaN(marks) || marks < 0) {
        toast.error(
          'All marks must be valid numbers greater than or equal to 0.',
        );
        return;
      }
      if (marks > exam.maxMarks) {
        toast.error(
          `Marks cannot exceed the exam's maximum allowed limit (${exam.maxMarks}).`,
        );
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
          data.messageEnglish ||
            data.message ||
            'Failed to save roster results.',
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

    setActionId(resultId);
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
      setActionId(null);
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
    if (parseFloat(correctedMarks) > correctionResult.exam.maxMarks) {
      toast.error(
        `Marks cannot exceed exam max marks (${correctionResult.exam.maxMarks}).`,
      );
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

  const getResultStatusBadge = (status: string) => {
    const variants: Record<
      string,
      'success' | 'warning' | 'info' | 'muted' | 'outline'
    > = {
      Finalized: 'success',
      Recorded: 'warning',
      Corrected: 'info',
      Pending: 'muted',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (initialResults.length === 0) {
    return (
      <EmptyState
        title="No students enrolled"
        description="There are no active student enrollments in the batch associated with this exam."
        icon={
          <ClipboardList className="h-10 w-10 text-[color:var(--ims-muted)]" />
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info Panel */}
      {exam && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-800">
              Direct Entry & Roster Verification
            </h2>
            <p className="text-xs text-slate-500">
              Maximum allowed:{' '}
              <span className="font-semibold">{exam.maxMarks}</span> marks •
              Pass mark threshold:{' '}
              <span className="font-semibold text-emerald-600">
                {exam.passMarks}
              </span>
            </p>
          </div>
          {isRosterEditable && (
            <div className="flex items-center gap-2">
              <LinkButton
                href={`/exam-completion/bulk-results?examId=${exam.id}`}
                variant="outline"
                className="gap-2 shrink-0"
              >
                <UploadCloud className="h-4 w-4" />
                Upload CSV Results
              </LinkButton>
            </div>
          )}
        </div>
      )}

      {/* Roster Table Card */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Results Roster</CardTitle>
          <CardDescription>
            Input grades directly into the inputs below and click "Save Roster
            Marks" to save draft changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
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
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 w-[120px]">
                    Grade
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
                              max={exam?.maxMarks}
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
                              / {exam?.maxMarks}
                            </span>
                          </div>
                        ) : (
                          <span className="font-semibold text-slate-700">
                            {r.resultStatus === 'Pending'
                              ? '-'
                              : `${r.marksObtained} / ${exam?.maxMarks}`}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {isEditable ? (
                          <input
                            type="text"
                            maxLength={10}
                            value={gradeValue}
                            onChange={(e) =>
                              handleInputChange(
                                r.enrollmentId,
                                'grade',
                                e.target.value,
                              )
                            }
                            disabled={saving}
                            placeholder="Grade"
                            className="w-20 h-9 rounded-lg border border-slate-200 px-2 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
                          />
                        ) : (
                          <span className="font-semibold text-indigo-600">
                            {r.grade || '-'}
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
                            canFinalize && (
                              <Button
                                onClick={() => handleFinalize(r.id)}
                                disabled={actionId !== null}
                                variant="primary"
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs px-2.5"
                              >
                                {actionId === r.id
                                  ? 'Finalizing...'
                                  : 'Finalize'}
                              </Button>
                            )}
                          {/* Correction Button */}
                          {isRowFinalized && canCorrect && (
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
                                Save roster to edit
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
        </CardContent>
      </Card>

      {/* Roster Submit Action Panel */}
      {isRosterEditable && (
        <div className="flex items-center justify-end gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">
            All inputs will be updated in Draft status.
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
                  {
                    correctionResult.enrollment.studentProfile?.person
                      ?.firstName
                  }{' '}
                  {correctionResult.enrollment.studentProfile?.person?.lastName}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <form onSubmit={handleCorrectSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                    <Input
                      label="Grade"
                      type="text"
                      maxLength={10}
                      value={correctedGrade}
                      onChange={(e) => setCorrectedGrade(e.target.value)}
                    />
                  </div>
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
