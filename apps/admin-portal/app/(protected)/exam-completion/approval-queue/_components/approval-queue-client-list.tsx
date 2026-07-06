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
  Textarea,
  EmptyState,
} from '@ims/shared-ui';
import { CheckSquare, Search, Award, Send, CheckCircle2, ChevronRight, MessageSquare, AlertCircle } from 'lucide-react';

interface CompletionItem {
  id: string;
  completionStatus: string;
  attendancePercentage: number | null;
  createdAt: Date | string;
  enrollment: {
    enrollmentNumber: string;
    studentProfile: {
      person: {
        firstName: string;
        lastName: string;
      };
    };
    course: {
      nameEnglish: string;
    };
  };
}

interface ApprovalQueueClientListProps {
  initialCompletions: CompletionItem[];
}

export function ApprovalQueueClientList({ initialCompletions }: ApprovalQueueClientListProps) {
  const router = useRouter();

  const [completions, setCompletions] = useState<CompletionItem[]>(initialCompletions);
  const [activeTab, setActiveTab] = useState<'trainer' | 'coordinator' | 'final'>('trainer');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group completions
  const trainerList = completions.filter(c => c.completionStatus === 'AwaitingTrainerRecommendation');
  const coordinatorList = completions.filter(c => c.completionStatus === 'AwaitingCoordinatorReview');
  const finalList = completions.filter(c => c.completionStatus === 'AwaitingFinalApproval');

  // Search filter
  const filterBySearch = (list: CompletionItem[]) => {
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(c => {
      const studentName = `${c.enrollment.studentProfile.person.firstName} ${c.enrollment.studentProfile.person.lastName}`.toLowerCase();
      const courseName = c.enrollment.course.nameEnglish.toLowerCase();
      const enrollmentNo = c.enrollment.enrollmentNumber.toLowerCase();
      return studentName.includes(term) || courseName.includes(term) || enrollmentNo.includes(term);
    });
  };

  const activeList = filterBySearch(
    activeTab === 'trainer' ? trainerList : activeTab === 'coordinator' ? coordinatorList : finalList
  );

  const handleAction = async (id: string, actionType: 'recommend' | 'coordinator-review' | 'final-approve', approved?: boolean) => {
    setIsSubmitting(true);
    const toastId = toast.loading('Processing approval workflow stage...');

    try {
      let url = `/api/v1/completions/${id}/recommend`;
      let body: any = { remarks };

      if (actionType === 'coordinator-review') {
        url = `/api/v1/completions/${id}/coordinator-review`;
        body = { approved, remarks };
      } else if (actionType === 'final-approve') {
        url = `/api/v1/completions/${id}/final-approve`;
        body = { approved, remarks };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.messageEnglish || resData.message || 'Failed to submit workflow action.');
      }

      toast.success(
        actionType === 'recommend'
          ? 'Completion successfully recommended to coordinator!'
          : approved
          ? 'Stage approved successfully!'
          : 'Completion rejected/sent back for reevaluation.',
        { id: toastId }
      );

      // Remove from UI list or update status
      setCompletions(prev => prev.filter(c => c.id !== id));
      setExpandedId(null);
      setRemarks('');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'An error occurred during execution.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'info' | 'warning' | 'error' | 'success' | 'outline' | 'muted'> = {
      AwaitingTrainerRecommendation: 'info',
      AwaitingCoordinatorReview: 'warning',
      AwaitingFinalApproval: 'warning',
      Approved: 'success',
      Rejected: 'error',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {status === 'AwaitingTrainerRecommendation'
          ? 'Awaiting Trainer'
          : status === 'AwaitingCoordinatorReview'
          ? 'Awaiting Coordinator'
          : status === 'AwaitingFinalApproval'
          ? 'Awaiting Final'
          : status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stat Cards as Tabs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <button
          onClick={() => { setActiveTab('trainer'); setExpandedId(null); }}
          className="text-left w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 rounded-2xl"
        >
          <Card className={`transition-all ${
            activeTab === 'trainer'
              ? 'border-indigo-300 shadow-md ring-2 ring-indigo-500/10 bg-indigo-50/10'
              : 'bg-white hover:border-slate-300'
          }`}>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-500">Trainer Recommendation</CardDescription>
              <CardTitle className="text-3xl font-extrabold mt-1 text-slate-900">{trainerList.length}</CardTitle>
            </CardHeader>
          </Card>
        </button>

        <button
          onClick={() => { setActiveTab('coordinator'); setExpandedId(null); }}
          className="text-left w-full focus:outline-none focus:ring-2 focus:ring-purple-500/20 rounded-2xl"
        >
          <Card className={`transition-all ${
            activeTab === 'coordinator'
              ? 'border-purple-300 shadow-md ring-2 ring-purple-500/10 bg-purple-50/10'
              : 'bg-white hover:border-slate-300'
          }`}>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-500">Coordinator Review</CardDescription>
              <CardTitle className="text-3xl font-extrabold mt-1 text-slate-900">{coordinatorList.length}</CardTitle>
            </CardHeader>
          </Card>
        </button>

        <button
          onClick={() => { setActiveTab('final'); setExpandedId(null); }}
          className="text-left w-full focus:outline-none focus:ring-2 focus:ring-amber-500/20 rounded-2xl"
        >
          <Card className={`transition-all ${
            activeTab === 'final'
              ? 'border-amber-300 shadow-md ring-2 ring-amber-500/10 bg-amber-50/10'
              : 'bg-white hover:border-slate-300'
          }`}>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-500">Final Approval</CardDescription>
              <CardTitle className="text-3xl font-extrabold mt-1 text-slate-900">{finalList.length}</CardTitle>
            </CardHeader>
          </Card>
        </button>
      </div>

      {/* Toolbar / Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100/80">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student, course, or enrollment number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500 px-1 shrink-0">
          Showing {activeList.length} of {
            activeTab === 'trainer' ? trainerList.length : activeTab === 'coordinator' ? coordinatorList.length : finalList.length
          } pending items
        </div>
      </div>

      {/* List Container */}
      {activeList.length === 0 ? (
        <Card className="bg-white shadow-sm border border-slate-100 py-16 text-center">
          <CardContent className="p-0">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Queue is Clear</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px] mx-auto">No completions are currently waiting in this workflow stage.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white border border-slate-100 shadow-sm overflow-hidden">
          <CardContent className="p-0 divide-y divide-slate-100">
            {activeList.map((c) => {
              const isExpanded = expandedId === c.id;
              return (
                <div key={c.id} className="transition-all hover:bg-slate-50/20">
                  {/* Row Header */}
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-800">
                          {c.enrollment.studentProfile.person.firstName} {c.enrollment.studentProfile.person.lastName}
                        </h3>
                        <span className="text-xs font-mono text-slate-400">({c.enrollment.enrollmentNumber})</span>
                        {getStatusBadge(c.completionStatus)}
                      </div>
                      <p className="text-xs text-[color:var(--ims-ink)] font-medium truncate">{c.enrollment.course.nameEnglish}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[color:var(--ims-muted)]">
                        <span>Evaluated: {new Date(c.createdAt).toLocaleDateString()}</span>
                        <span>
                          Attendance:{' '}
                          <strong className={c.attendancePercentage && c.attendancePercentage >= 75 ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                            {c.attendancePercentage !== null ? `${c.attendancePercentage}%` : 'N/A'}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <Button
                        onClick={() => {
                          if (isExpanded) {
                            setExpandedId(null);
                            setRemarks('');
                          } else {
                            setExpandedId(c.id);
                            setRemarks('');
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                      >
                        {isExpanded ? 'Close Panel' : 'Take Action'}
                        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </Button>
                    </div>
                  </div>

                  {/* Collapsible Action Panel */}
                  {isExpanded && (
                    <div className="bg-slate-50/50 border-t border-slate-100 p-5 space-y-4 animate-fade-in-up">
                      <Textarea
                        label="Decision Remarks"
                        rows={3}
                        placeholder="Provide any feedback, audit notes, or explanations for this workflow decision..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        disabled={isSubmitting}
                      />

                      <div className="flex items-center justify-end gap-3 border-t border-slate-100/50 pt-3">
                        {activeTab === 'trainer' && (
                          <Button
                            onClick={() => handleAction(c.id, 'recommend')}
                            disabled={isSubmitting}
                            variant="primary"
                            className="gap-2"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Recommend for Approval
                          </Button>
                        )}

                        {activeTab === 'coordinator' && (
                          <>
                            <Button
                              onClick={() => handleAction(c.id, 'coordinator-review', false)}
                              disabled={isSubmitting}
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-rose-50"
                            >
                              Reject & Reevaluate
                            </Button>
                            <Button
                              onClick={() => handleAction(c.id, 'coordinator-review', true)}
                              disabled={isSubmitting}
                              variant="primary"
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              Approve Coordinator Review
                            </Button>
                          </>
                        )}

                        {activeTab === 'final' && (
                          <>
                            <Button
                              onClick={() => handleAction(c.id, 'final-approve', false)}
                              disabled={isSubmitting}
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-rose-50"
                            >
                              Reject Completion
                            </Button>
                            <Button
                              onClick={() => handleAction(c.id, 'final-approve', true)}
                              disabled={isSubmitting}
                              variant="primary"
                              className="bg-green-600 hover:bg-green-700 gap-1.5"
                            >
                              <Award className="h-4 w-4" />
                              Approve Final Completion
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
