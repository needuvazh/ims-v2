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
  CardFooter,
  Select,
  Textarea,
  Button,
  Badge,
  EmptyState,
} from '@ims/shared-ui';
import { UploadCloud, CheckCircle, Trash2, Calendar, ClipboardList } from 'lucide-react';

type ExamItem = {
  id: string;
  examName: string;
  courseName: string;
  batchName: string;
  maxMarks: number;
  passMarks: number;
};

type EnrollmentItem = {
  id: string;
  enrollmentNumber: string;
  studentName: string;
};

interface BulkResultsFormProps {
  exams: ExamItem[];
  enrollments: EnrollmentItem[];
}

interface ParsedRow {
  enrollmentNumber: string;
  enrollmentId: string | null;
  studentName: string | null;
  marksObtained: number;
  grade: string;
  isValid: boolean;
  errorReason?: string;
}

export function BulkResultsForm({ exams, enrollments }: BulkResultsFormProps) {
  const router = useRouter();

  const [examId, setExamId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedExam = exams.find(e => e.id === examId);

  // Parse file or typed text
  const handleParse = (textToParse: string) => {
    if (!examId || !selectedExam) {
      toast.error('Please select an exam first.');
      return;
    }

    const lines = textToParse.split('\n');
    const tempRows: ParsedRow[] = [];

    lines.forEach((line) => {
      const cleanLine = line.trim();
      if (!cleanLine) return; // skip empty lines

      // Expect format: enrollmentNumber,marksObtained,grade
      const parts = cleanLine.split(',');
      const rawEnrollmentNumber = parts[0]?.trim() || '';
      const rawMarks = parts[1]?.trim() || '';
      const rawGrade = parts[2]?.trim() || '';

      const matchedEnrollment = enrollments.find(
        (e) => e.enrollmentNumber.toLowerCase() === rawEnrollmentNumber.toLowerCase()
      );

      const parsedMarks = parseFloat(rawMarks);
      let isValid = true;
      let errorReason = '';

      if (!rawEnrollmentNumber) {
        isValid = false;
        errorReason = 'Missing enrollment number';
      } else if (!matchedEnrollment) {
        isValid = false;
        errorReason = `Enrollment '${rawEnrollmentNumber}' not found`;
      } else if (isNaN(parsedMarks) || parsedMarks < 0) {
        isValid = false;
        errorReason = `Invalid marks value: '${rawMarks}'`;
      } else if (parsedMarks > selectedExam.maxMarks) {
        isValid = false;
        errorReason = `Marks exceed exam max marks (${selectedExam.maxMarks})`;
      }

      tempRows.push({
        enrollmentNumber: rawEnrollmentNumber,
        enrollmentId: matchedEnrollment?.id || null,
        studentName: matchedEnrollment?.studentName || null,
        marksObtained: isNaN(parsedMarks) ? 0 : parsedMarks,
        grade: rawGrade,
        isValid,
        errorReason,
      });
    });

    setParsedRows(tempRows);
    if (tempRows.length > 0) {
      const invalidCount = tempRows.filter(r => !r.isValid).length;
      if (invalidCount > 0) {
        toast.warning(`Parsed ${tempRows.length} rows. Found ${invalidCount} validation errors.`);
      } else {
        toast.success(`Successfully parsed ${tempRows.length} valid rows!`);
      }
    }
  };

  // Handle CSV File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      handleParse(text);
    };
    reader.readAsText(file);
  };

  const handleTextareaParse = () => {
    handleParse(csvText);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!examId) {
      toast.error('Please select an exam.');
      return;
    }

    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast.error('There are no valid rows to submit.');
      return;
    }

    const invalidRows = parsedRows.filter(r => !r.isValid);
    if (invalidRows.length > 0) {
      const confirmProceed = window.confirm(
        `There are ${invalidRows.length} invalid rows that will be ignored. Do you want to proceed with submitting the ${validRows.length} valid rows?`
      );
      if (!confirmProceed) return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Submitting bulk results roster...');

    try {
      const response = await fetch('/api/v1/results/bulk/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          results: validRows.map(r => ({
            enrollmentId: r.enrollmentId,
            marksObtained: r.marksObtained,
            grade: r.grade || undefined,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.messageEnglish || data.message || 'Failed to submit bulk results.');
      }

      toast.success(`Bulk entry successful! Processed ${validRows.length} results.`, { id: toastId });
      router.push(`/exam-completion/results?examId=${examId}`);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to submit bulk results.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto max-w-4xl bg-white border border-slate-100 shadow-sm">
      <CardHeader>
        <CardTitle>Bulk Import Roster</CardTitle>
        <CardDescription>
          Import scores in bulk. Select an active exam open for entry, then import using CSV or raw text.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1: Select Exam */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b pb-2 tracking-wide uppercase text-slate-600">1. Select Active Exam</h2>
            <Select
              label="Active Exam (Open for entry)"
              placeholder="Choose Exam"
              value={examId}
              onValueChange={(val) => {
                setExamId(val);
                setParsedRows([]); // Reset parsed list
              }}
              options={exams.map((e) => ({
                value: e.id,
                label: `${e.examName} (${e.courseName} • ${e.batchName}) - Max Marks: ${e.maxMarks}`,
              }))}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Step 2: Import Source */}
          {examId && (
            <div className="space-y-4 animate-fade-in-up">
              <h2 className="text-sm font-bold text-slate-800 border-b pb-2 tracking-wide uppercase text-slate-600">2. Upload File or Paste CSV</h2>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* File Uploader */}
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:bg-slate-50 transition-colors">
                  <UploadCloud className="h-8 w-8 text-indigo-500 mb-2" />
                  <span className="text-sm font-semibold text-slate-700">Upload CSV File</span>
                  <span className="text-xs text-[color:var(--ims-muted)] mt-1 max-w-[220px]">
                    Columns must align to: EnrollmentNumber, Marks, Grade
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="mt-4 w-full max-w-xs text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                </div>

                {/* Paste Box */}
                <div className="space-y-3">
                  <Textarea
                    label="Paste Comma-Separated Values (CSV)"
                    rows={5}
                    placeholder={`ENR-123456,85,A\nENR-234567,72,B\nENR-345678,45,C`}
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    onClick={handleTextareaParse}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Parse & Preview List
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Roster Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-4 animate-fade-in-up">
              <h2 className="text-sm font-bold text-slate-800 border-b pb-2 tracking-wide uppercase text-slate-600">3. Import Verification Preview</h2>
              <div className="overflow-hidden rounded-xl border border-slate-100 shadow-sm">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50/70">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">Student Name</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500 w-[140px]">Enrollment #</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500 w-[100px]">Marks</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500 w-[100px]">Grade</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500 w-[200px]">Verification Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedRows.map((r, idx) => (
                      <tr key={idx} className={r.isValid ? 'hover:bg-slate-50/50 transition-colors' : 'bg-red-50/30 hover:bg-red-50/40 transition-colors'}>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                          {r.studentName || <span className="text-red-500 italic">Unknown Student</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 font-mono">
                          {r.enrollmentNumber}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-700">
                          {r.marksObtained}
                        </td>
                        <td className="px-4 py-3 text-sm text-indigo-600 font-bold">
                          {r.grade || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {r.isValid ? (
                            <Badge variant="success">Valid Item</Badge>
                          ) : (
                            <Badge variant="error" className="normal-case tracking-normal">
                              {r.errorReason}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  onClick={() => {
                    setParsedRows([]);
                    setCsvText('');
                  }}
                  disabled={isSubmitting}
                  variant="outline"
                >
                  Clear Preview
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || parsedRows.filter(r => r.isValid).length === 0}
                  variant="primary"
                >
                  {isSubmitting ? 'Importing...' : 'Confirm Bulk Import'}
                </Button>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
