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
  Select,
  Button,
} from '@ims/shared-ui';

type EnrollmentItem = {
  id: string;
  enrollmentNumber: string;
  studentName: string;
  courseName: string;
};

interface EvaluateFormProps {
  enrollments: EnrollmentItem[];
}

export function EvaluateForm({ enrollments }: EvaluateFormProps) {
  const router = useRouter();
  const [enrollmentId, setEnrollmentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!enrollmentId) {
      toast.error('Please select a student enrollment record.');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Running completion evaluation engine...');

    try {
      const response = await fetch('/api/v1/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.messageEnglish || data.message || 'Evaluation failed.');
      }

      toast.success('Course completion evaluated successfully!', { id: toastId });
      // Redirect to the newly created completion details page
      router.push(`/exam-completion/completions/${data.data.id}`);
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Evaluation failed.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto max-w-2xl bg-white border border-slate-100 shadow-sm">
      <CardHeader>
        <CardTitle>Evaluation Parameters</CardTitle>
        <CardDescription>
          Run checks across the academic registry. The system verifies attendance threshold, exam marks, and payment standing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Select
              label="Student Enrollment"
              placeholder="Search and choose student enrollment..."
              value={enrollmentId}
              onValueChange={(val) => setEnrollmentId(val)}
              options={enrollments.map((e) => ({
                value: e.id,
                label: `${e.studentName} (${e.enrollmentNumber}) - ${e.courseName}`,
              }))}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <Button
              type="button"
              onClick={() => router.push('/exam-completion/completions')}
              disabled={isSubmitting}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              variant="primary"
            >
              {isSubmitting ? 'Evaluating...' : 'Evaluate Completion'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
