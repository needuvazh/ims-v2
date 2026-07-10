'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Input,
  Select,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@ims/shared-ui';

type CourseItem = {
  id: string;
  nameEnglish: string;
};

type BatchItem = {
  id: string;
  batchNameEnglish: string;
  courseId: string;
};

interface ExamFormProps {
  courses: CourseItem[];
  batches: BatchItem[];
}

export function ExamForm({ courses, batches }: ExamFormProps) {
  const router = useRouter();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const [courseId, setCourseId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [maxMarks, setMaxMarks] = useState('');
  const [passMarks, setPassMarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter batches based on selected courseId
  const filteredBatches = batches.filter((b) => b.courseId === courseId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!courseId) {
      toast.error('Please select a course.');
      return;
    }
    if (!batchId) {
      toast.error('Please select a batch.');
      return;
    }
    if (!examName.trim()) {
      toast.error('Exam name is required.');
      return;
    }
    if (!examDate) {
      toast.error('Exam date is required.');
      return;
    }
    const selectedDate = new Date(examDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate.getTime() <= today.getTime()) {
      toast.error('Exam date must be in the future.');
      return;
    }
    if (!maxMarks || parseFloat(maxMarks) <= 0) {
      toast.error('Max marks must be greater than 0.');
      return;
    }
    if (!passMarks || parseFloat(passMarks) < 0) {
      toast.error('Pass marks must be at least 0.');
      return;
    }
    if (parseFloat(passMarks) > parseFloat(maxMarks)) {
      toast.error('Pass marks cannot exceed maximum marks.');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Creating exam...');

    try {
      const response = await fetch('/api/v1/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          batchId,
          examName,
          examDate,
          maxMarks: parseFloat(maxMarks),
          passMarks: parseFloat(passMarks),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.messageEnglish || data.message || 'Failed to create exam.',
        );
      }

      toast.success('Exam created successfully in Draft status!', {
        id: toastId,
      });
      router.push('/exam-completion/exams');
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to create exam.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto max-w-2xl bg-white shadow-sm border border-slate-100">
      <CardHeader>
        <CardTitle>Exam Parameters</CardTitle>
        <CardDescription>
          Specify the course, branch cohort, assessment schedule, and passing
          standards.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Select
              label="Course"
              placeholder="Choose Course"
              value={courseId}
              onValueChange={(val) => {
                setCourseId(val);
                setBatchId('');
              }}
              options={courses.map((c) => ({
                value: c.id,
                label: c.nameEnglish,
              }))}
              disabled={isSubmitting}
              required
            />

            <Select
              label="Batch"
              placeholder="Choose Batch"
              value={batchId}
              onValueChange={(val) => setBatchId(val)}
              options={filteredBatches.map((b) => ({
                value: b.id,
                label: b.batchNameEnglish,
              }))}
              disabled={isSubmitting || !courseId}
              required
            />

            <Input
              label="Exam Name"
              type="text"
              placeholder="e.g. Final Theoretical Assessment"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              disabled={isSubmitting}
              required
            />

            <Input
              label="Exam Date"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              disabled={isSubmitting}
              min={minDate}
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Maximum Marks"
                type="number"
                min="1"
                step="any"
                placeholder="e.g. 100"
                value={maxMarks}
                onChange={(e) => setMaxMarks(e.target.value)}
                disabled={isSubmitting}
                required
              />

              <Input
                label="Passing Marks"
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 50"
                value={passMarks}
                onChange={(e) => setPassMarks(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <Button
              type="button"
              onClick={() => router.push('/exam-completion/exams')}
              disabled={isSubmitting}
              variant="outline"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} variant="primary">
              {isSubmitting ? 'Creating...' : 'Create Exam'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
