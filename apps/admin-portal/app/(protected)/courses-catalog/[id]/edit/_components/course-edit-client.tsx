'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CourseForm } from '../../../_components/course-form';
import { updateCourseAction, transitionCourseStatusAction } from '../../../actions';
import {
  Button,
  Badge,
  Alert,
} from '@ims/shared-ui';
import {
  ShieldAlert,
  ArrowRightLeft,
  Loader2,
  FileCheck,
  CheckCircle,
  Archive,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface CourseEditClientProps {
  course: any;
  categories: any[];
  departments: any[];
  sessionPermissions: string[];
}

export function CourseEditClient({
  course,
  categories,
  departments,
  sessionPermissions,
}: CourseEditClientProps) {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const canPublish = sessionPermissions.includes('course.catalog.publish');
  const canArchive = sessionPermissions.includes('course.catalog.archive');

  const handleTransition = async (targetStatus: string) => {
    try {
      setIsTransitioning(true);
      const res = await transitionCourseStatusAction(course.id, targetStatus, course.version);
      if (!res.success) {
        toast.error(res.error || 'Failed to transition status.');
      } else {
        toast.success(`Course transitioned to ${targetStatus} successfully!`);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during status transition.');
    } finally {
      setIsTransitioning(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'InReview':
        return <Badge variant="info">InReview</Badge>;
      case 'Approved':
        return <Badge variant="default">Approved</Badge>;
      case 'Published':
        return <Badge variant="success">Published</Badge>;
      case 'Archived':
        return <Badge variant="error">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Rail Action Bar */}
      <div className="bg-slate-50 border border-[color:var(--ims-border)] p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <ArrowRightLeft className="h-5 w-5 text-slate-500" />
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Current Catalog Status</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-bold text-slate-800 text-sm">{course.courseCode}</span>
              {getStatusBadge(course.status)}
            </div>
          </div>
        </div>

        {/* State Machine Transition Buttons */}
        <div className="flex flex-wrap gap-2">
          {course.status === 'Draft' && canPublish && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTransition('InReview')}
              disabled={isTransitioning}
              className="flex items-center gap-1"
            >
              {isTransitioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileCheck className="h-3.5 w-3.5" />}
              Submit for Review
            </Button>
          )}

          {course.status === 'InReview' && canPublish && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTransition('Draft')}
                disabled={isTransitioning}
                className="flex items-center gap-1"
              >
                Revert to Draft
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleTransition('Approved')}
                disabled={isTransitioning}
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white border-none"
              >
                {isTransitioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                Approve Template
              </Button>
            </>
          )}

          {course.status === 'Approved' && canPublish && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTransition('Draft')}
                disabled={isTransitioning}
              >
                Revert to Draft
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleTransition('Published')}
                disabled={isTransitioning}
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isTransitioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Publish Catalog Template
              </Button>
            </>
          )}

          {course.status === 'Published' && canArchive && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleTransition('Archived')}
              disabled={isTransitioning}
              className="flex items-center gap-1"
            >
              {isTransitioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
              Archive Course
            </Button>
          )}

          {course.status === 'Archived' && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 font-semibold bg-red-50 px-2.5 py-1.5 rounded border border-red-100">
              <ShieldAlert className="h-3.5 w-3.5" />
              This template is archived and cannot be edited.
            </div>
          )}
        </div>
      </div>

      {/* Warning if Archived */}
      {course.status === 'Archived' && (
        <Alert variant="error" title="Archived Template Locked">
          This course template is logically deleted and archived. Re-publishing or modifications require administrative overrides.
        </Alert>
      )}

      {/* Course Edit Form */}
      {course.status !== 'Archived' && (
        <CourseForm
          initialData={course}
          categories={categories}
          departments={departments}
          onSubmitAction={(data) => updateCourseAction(course.id, course.version, data)}
        />
      )}
    </div>
  );
}
