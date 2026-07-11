'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  FormField,
  FormLabel,
  FormControl,
  Input,
  Badge,
  Breadcrumbs,
  PageHeader,
  Select,
  Textarea,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Pagination,
  EmptyState,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ims/shared-ui';
import {
  addLeadNoteAction,
  updateLeadStageAction,
} from '../../actions';
import { LogFollowUpModal } from './log-followup-modal';
import {
  Pencil,
  UserCheck,
  User,
  Compass,
  Activity,
  Home,
  ClipboardList,
  Check,
  Eye,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  School,
  GraduationCap,
  ExternalLink,
  BookOpen,
  Award,
  AlertCircle,
  Clock3,
} from 'lucide-react';

interface LeadNoteDto {
  id: string;
  content: string;
  createdAt: string;
  authorName: string;
}

interface LeadStageHistoryDto {
  id: string;
  performedAt: string;
  performerName: string;
  oldStage: string;
  newStage: string;
  lostReasonCode: string | null;
  lostReasonNotes: string | null;
}

interface LeadDetailsClientProps {
  lead: any;
  notes: LeadNoteDto[];
  stageHistory: LeadStageHistoryDto[];
  followUps: any[];
  followUpsTotal: number;
  currentFollowUpPage: number;
  admissionId?: string | null;
  initialDocuments?: any[];
  admission?: any;
  enrollment?: any;
  sessionPermissions?: string[];
}

export function LeadDetailsClient({
  lead: initialLead,
  notes,
  stageHistory,
  followUps,
  followUpsTotal,
  currentFollowUpPage,
  admissionId: initialAdmissionId,
  admission,
  enrollment,
  sessionPermissions = [],
}: LeadDetailsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lead, setLead] = useState(initialLead);
  const [admissionId, setAdmissionId] = useState(initialAdmissionId);
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);

  const getAdmissionStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'success';
      case 'Submitted':
        return 'warning';
      case 'Draft':
        return 'default';
      case 'Rejected':
        return 'error';
      case 'Cancelled':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getEnrollmentStatusBadge = (status: string) => {
    switch (status) {
      case 'Confirmed':
      case 'Active':
      case 'CertificateIssued':
        return 'success';
      case 'Draft':
      case 'Submitted':
      case 'Approved':
        return 'warning';
      case 'Cancelled':
      case 'Dropped':
        return 'error';
      default:
        return 'outline';
    }
  };

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'success';
      case 'PartiallyPaid':
      case 'Issued':
        return 'warning';
      case 'Draft':
        return 'default';
      case 'Overdue':
      case 'Cancelled':
        return 'error';
      default:
        return 'outline';
    }
  };

  useEffect(() => {
    setLead(initialLead);
    setAdmissionId(initialAdmissionId);
  }, [initialLead, initialAdmissionId]);

  // Notes State
  const [localNotes, setLocalNotes] = useState<LeadNoteDto[]>(notes);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [notesPage, setNotesPage] = useState(1);

  // Timeline Expansion State
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

  // Stage Update State
  const [isEditingStage, setIsEditingStage] = useState(false);
  const [stageValue, setStageValue] = useState(lead.stage);
  const [lostCodeValue, setLostCodeValue] = useState(lead.lostReasonCode || '');
  const [lostNotesValue, setLostNotesValue] = useState(
    lead.lostReasonNotes || '',
  );
  const [isSavingStage, setIsSavingStage] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);

  // Follow-Up States
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleType, setScheduleType] = useState<
    'Call' | 'WhatsApp' | 'Email' | 'Visit'
  >('Call');
  const [scheduleAgenda, setScheduleAgenda] = useState('');
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [activeFollowUpId, setActiveFollowUpId] = useState<string | null>(null);

  const getStageBadgeVariant = (stage: string) => {
    switch (stage) {
      case 'New':
        return 'default';
      case 'FollowUp':
        return 'warning';
      case 'Won':
        return 'success';
      case 'Lost':
        return 'error';
      case 'Converted':
        return 'success';
      default:
        return 'outline';
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    try {
      setIsAddingNote(true);
      const res = await addLeadNoteAction(lead.id, newNoteContent.trim());
      if (res.success) {
        toast.success('Note added successfully');

        // Add note locally to update list immediately
        const newNote: LeadNoteDto = {
          id: Math.random().toString(),
          content: newNoteContent.trim(),
          createdAt: new Date().toISOString(),
          authorName: 'Current User',
        };
        setLocalNotes((prev) => [newNote, ...prev]);
        setNewNoteContent('');
        setNotesPage(1);

        // Trigger server components refresh
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to add note');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred adding the note');
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleStageUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStageError(null);

    if (stageValue === 'Lost') {
      if (!lostCodeValue) {
        setStageError('Lost reason code is required');
        return;
      }
      if (!lostNotesValue || lostNotesValue.trim().length < 15) {
        setStageError('Lost reason details must be at least 15 characters');
        return;
      }
    }

    try {
      setIsSavingStage(true);
      const res = (await updateLeadStageAction(
        lead.id,
        stageValue,
        stageValue === 'Lost' ? lostCodeValue : undefined,
        stageValue === 'Lost' ? lostNotesValue.trim() : undefined,
        lead.version,
      )) as any;

      if (res.success) {
        toast.success('Lead stage updated successfully');
        setLead({
          ...lead,
          stage: stageValue,
          lostReasonCode: stageValue === 'Lost' ? lostCodeValue : null,
          lostReasonNotes: stageValue === 'Lost' ? lostNotesValue.trim() : null,
        });
        setIsEditingStage(false);
        router.refresh();
      } else {
        setStageError(res.error || 'Failed to update stage');
      }
    } catch (err: any) {
      setStageError(err.message || 'An error occurred updating stage');
    } finally {
      setIsSavingStage(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleError(null);

    const minFuture = Date.now() + 300000;
    if (new Date(scheduleDate).getTime() <= minFuture) {
      setScheduleError(
        'Schedule date-time must be set in the future (minimum 5 minutes).',
      );
      return;
    }
    if (scheduleAgenda.trim().length < 5) {
      setScheduleError(
        'Agenda must specify communication details (min 5 chars).',
      );
      return;
    }

    try {
      setIsScheduling(true);
      const res = await fetch(`/api/v1/crm/leads/${lead.id}/follow-ups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followUpDate: new Date(scheduleDate).toISOString(),
          followUpType: scheduleType,
          agenda: scheduleAgenda.trim(),
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(
          result.messageEnglish || 'Failed to schedule follow-up',
        );
      }

      toast.success('Follow-up scheduled successfully');
      setShowScheduleDialog(false);
      setScheduleDate('');
      setScheduleAgenda('');
      router.refresh();
    } catch (err: any) {
      setScheduleError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsScheduling(false);
    }
  };

  // Client Side Notes Pagination
  const notesLimit = 5;
  const totalNotesPages = Math.ceil(localNotes.length / notesLimit);
  const paginatedNotes = localNotes.slice(
    (notesPage - 1) * notesLimit,
    notesPage * notesLimit,
  );

  const handleStepClick = (clickedStageName: string) => {
    if (lead.stage === 'Converted') return;
    if (lead.stage === clickedStageName) return;

    setStageValue(clickedStageName);
    setLostCodeValue('');
    setLostNotesValue('');
    setStageError(null);
    setIsEditingStage(true);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Lead Details: ${lead.firstName} ${lead.lastName}`}
        description={`Lead Number: ${lead.leadNumber}`}
        backUrl="/leads"
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Dashboard',
                href: '/dashboard',
                icon: <Home className="h-3.5 w-3.5" />,
              },
              {
                label: 'Leads',
                href: '/leads',
                icon: <ClipboardList className="h-3.5 w-3.5" />,
              },
              { label: 'Details', icon: <Eye className="h-3.5 w-3.5" /> },
            ]}
          />
        }
        actions={
          <div className="flex items-center gap-2">
            {lead.stage !== 'Converted' && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => router.push(`/leads/${lead.id}/edit`)}
              >
                <Pencil className="h-4 w-4" />
                Edit Details
              </Button>
            )}
            {lead.stage === 'Qualified' && (
              <Button
                size="sm"
                className="gap-2 bg-[color:var(--ims-ink)] hover:bg-[color:var(--ims-brass)] text-white"
                onClick={() => router.push(`/leads/${lead.id}/convert`)}
              >
                <UserCheck className="h-4 w-4" />
                Convert to Student
              </Button>
            )}
          </div>
        }
      />

      <div className="space-y-6">
        {lead.stage === 'Converted' && admissionId && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">
                  Lead Converted Successfully
                </h4>
                <p className="text-xs text-emerald-700">
                  This lead is now a student. All handoff identity documents
                  have been registered under their profile.
                </p>
              </div>
            </div>
            <Button
              onClick={() => router.push(`/admissions/${admissionId}`)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 gap-1.5"
            >
              <Eye className="h-4 w-4" /> View Student Admission
            </Button>
          </div>
        )}

        {/* Progression Stepper Card */}
        {(() => {
          const standardStages = ['New', 'Contacted', 'FollowUp', 'Qualified', 'Negotiation'];
          const displayStages = [...standardStages];
          if (lead.stage === 'Lost') {
            displayStages.push('Lost');
          } else if (lead.stage === 'Converted') {
            displayStages.push('Converted');
          } else {
            displayStages.push('Won');
          }

          return (
            <div className="border border-[color:var(--ims-border)] p-6 rounded-2xl bg-white/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-[color:var(--ims-ink)] font-display">
                  <Activity className="h-4 w-4 text-[color:var(--ims-brass)]" />
                  Lead Progression
                </h3>
                {lead.stage !== 'Converted' && (
                  <span className="text-[10px] text-[color:var(--ims-muted)] hidden sm:inline">
                    Click a stage to transition the lead
                  </span>
                )}
              </div>

              {/* Stepper horizontal scroll container */}
              <div className="w-full overflow-x-auto pb-2 scrollbar-none">
                <div className="flex items-center justify-between min-w-[650px] md:min-w-0 py-2">
                  {displayStages.map((stageName, idx) => {
                    const currentIdx = displayStages.indexOf(lead.stage);
                    const isCurrent = lead.stage === stageName;
                    const isCompleted = idx < currentIdx;
                    const isClickable = lead.stage !== 'Converted' && stageName !== 'Converted';

                    return (
                      <div key={stageName} className="flex items-center flex-1 last:flex-none">
                        {/* Step Node */}
                        <div className="flex flex-col items-center relative min-w-[80px]">
                          <button
                            type="button"
                            disabled={!isClickable}
                            onClick={() => handleStepClick(stageName)}
                            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-200
                              ${isCurrent
                                ? stageName === 'Lost'
                                  ? 'border-red-500 bg-red-500 text-white ring-4 ring-red-100 shadow-md font-bold'
                                  : stageName === 'Converted'
                                    ? 'border-emerald-600 bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-md font-bold'
                                    : 'border-indigo-600 bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-md font-bold'
                                : isCompleted
                                  ? 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 hover:border-emerald-600'
                                  : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-700'
                              }
                              ${!isClickable && 'cursor-default'}
                            `}
                          >
                            {isCompleted ? (
                              <Check className="h-4 w-4 stroke-[3]" />
                            ) : (
                              <span className="text-xs font-semibold">{idx + 1}</span>
                            )}
                          </button>
                          <span
                            className={`mt-2 text-[11px] font-medium tracking-wide whitespace-nowrap
                              ${isCurrent
                                ? stageName === 'Lost'
                                  ? 'text-red-600 font-semibold'
                                  : stageName === 'Converted'
                                    ? 'text-emerald-600 font-semibold'
                                    : 'text-indigo-600 font-semibold'
                                : 'text-[color:var(--ims-muted)]'
                              }
                            `}
                          >
                            {stageName}
                          </span>
                        </div>

                        {/* Connecting Line */}
                        {idx < displayStages.length - 1 && (
                          <div
                            className={`h-0.5 flex-grow mx-2 min-w-[20px] transition-colors duration-200
                              ${idx < currentIdx ? 'bg-emerald-500' : 'bg-slate-200'}
                            `}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status details bar below stepper when NOT editing */}
              {!isEditingStage && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-[color:var(--ims-muted)] block mb-0.5 text-[10px] uppercase tracking-wider">
                        Current Stage
                      </span>
                      <Badge variant={getStageBadgeVariant(lead.stage)} className="text-xs px-2.5 py-0.5">
                        {lead.stage}
                      </Badge>
                    </div>
                    {lead.priority && (
                      <div>
                        <span className="text-[color:var(--ims-muted)] block mb-0.5 text-[10px] uppercase tracking-wider">
                          Priority
                        </span>
                        <span className="font-semibold text-[color:var(--ims-ink)] text-sm">
                          {lead.priority}
                        </span>
                      </div>
                    )}
                  </div>

                  {lead.stage !== 'Converted' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-7 px-3 gap-1 flex items-center border-slate-200"
                      onClick={() => {
                        setStageValue(lead.stage);
                        setLostCodeValue(lead.lostReasonCode || '');
                        setLostNotesValue(lead.lostReasonNotes || '');
                        setIsEditingStage(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                      Change Stage
                    </Button>
                  )}
                </div>
              )}

              {/* Lost info display */}
              {!isEditingStage && lead.stage === 'Lost' && (
                <div className="mt-4 p-4 bg-red-50/50 border border-red-100 rounded-xl space-y-2 text-xs">
                  <div>
                    <span className="font-bold text-[color:var(--ims-error)]">Lost Reason Code:</span>{' '}
                    <span className="font-semibold text-[color:var(--ims-ink)]">
                      {lead.lostReasonCode || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-[color:var(--ims-error)]">Lost Explanatory Notes:</span>
                    <p className="mt-1 text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap">
                      {lead.lostReasonNotes || 'No explanatory notes provided.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Inline Form Confirmation */}
              {isEditingStage && (
                <form
                  onSubmit={handleStageUpdate}
                  className="mt-4 pt-4 border-t border-slate-100 space-y-4 max-w-xl text-xs"
                >
                  {stageError && (
                    <div className="p-2 bg-red-50 border border-red-200 text-[color:var(--ims-error)] rounded-lg text-xs">
                      {stageError}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField>
                      <FormLabel required>Pipeline Stage</FormLabel>
                      <Select
                        value={stageValue}
                        onChange={(e) => setStageValue(e.target.value)}
                        options={[
                          { value: 'New', label: 'New' },
                          { value: 'Contacted', label: 'Contacted' },
                          { value: 'FollowUp', label: 'FollowUp' },
                          { value: 'Qualified', label: 'Qualified' },
                          { value: 'Negotiation', label: 'Negotiation' },
                          { value: 'Won', label: 'Won' },
                          { value: 'Lost', label: 'Lost' },
                        ]}
                      />
                    </FormField>
                  </div>

                  {stageValue === 'Lost' && (
                    <div className="border border-[color:var(--ims-border)] p-4 rounded-xl bg-slate-50 space-y-4">
                      <FormField>
                        <FormLabel required>Lost Reason Code</FormLabel>
                        <Select
                          value={lostCodeValue}
                          onChange={(e) => setLostCodeValue(e.target.value)}
                          options={[
                            { value: '', label: 'Select reason' },
                            { value: 'PriceTooHigh', label: 'Price too high' },
                            {
                              value: 'CompetitorChosen',
                              label: 'Chose competitor',
                            },
                            {
                              value: 'TimingNotGood',
                              label: 'Timing not good',
                            },
                            {
                              value: 'NoResponse',
                              label: 'Lost contact / no response',
                            },
                            { value: 'Other', label: 'Other reason' },
                          ]}
                        />
                      </FormField>
                      <FormField>
                        <FormLabel required>
                          Lost Details (Min 15 characters)
                        </FormLabel>
                        <Textarea
                          placeholder="Please specify lost reason in details..."
                          rows={3}
                          value={lostNotesValue}
                          onChange={(e) => setLostNotesValue(e.target.value)}
                        />
                      </FormField>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button type="submit" size="sm" disabled={isSavingStage}>
                      {isSavingStage ? 'Saving...' : 'Save Stage'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingStage(false)}
                      disabled={isSavingStage}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          );
        })()}

        {/* First Row: Lead Profile Card (Accordion format) */}
        <div className="border border-[color:var(--ims-border)] p-6 rounded-2xl space-y-4 bg-white/80 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-[color:var(--ims-ink)] font-display">
              <User className="h-4 w-4 text-[color:var(--ims-brass)]" />
              Lead Profile
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 px-2 hover:bg-slate-100 text-[color:var(--ims-brass)] border border-slate-200 gap-1 flex items-center"
              onClick={() => setIsProfileExpanded(!isProfileExpanded)}
            >
              {isProfileExpanded ? (
                <>
                  <span>Show Less</span>
                  <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  <span>Show More</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 text-xs">
            <div>
              <span className="text-[color:var(--ims-muted)] block mb-0.5">
                Full Name
              </span>
              <span className="font-semibold text-[color:var(--ims-ink)] text-sm">
                {lead.firstName} {lead.lastName}
              </span>
            </div>
            <div>
              <span className="text-[color:var(--ims-muted)] block mb-0.5">
                Phone Number
              </span>
              <span className="font-semibold text-[color:var(--ims-ink)] text-sm">
                {lead.phone}
              </span>
            </div>
            <div>
              <span className="text-[color:var(--ims-muted)] block mb-0.5">
                Email Address
              </span>
              <span className="font-semibold text-[color:var(--ims-ink)] text-sm">
                {lead.email || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[color:var(--ims-muted)] block mb-0.5">
                Interested Course
              </span>
              <span className="font-semibold text-[color:var(--ims-ink)] text-sm">
                {lead.interestedCourse?.nameEnglish || lead.interestedCourseId}
              </span>
            </div>

            {isProfileExpanded && (
              <>
                <div>
                  <span className="text-[color:var(--ims-muted)] block mb-0.5">
                    Date of Birth
                  </span>
                  <span className="font-semibold text-[color:var(--ims-ink)] text-sm">
                    {lead.person?.dateOfBirth
                      ? new Date(lead.person.dateOfBirth).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[color:var(--ims-muted)] block mb-0.5">
                    Nationality
                  </span>
                  <span className="font-semibold text-[color:var(--ims-ink)] text-sm">
                    {lead.nationality || lead.person?.nationality || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[color:var(--ims-muted)] block mb-0.5">
                    ID Number
                  </span>
                  <span className="font-semibold text-[color:var(--ims-ink)] text-sm">
                    {lead.nationalId || lead.person?.nationalId || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[color:var(--ims-muted)] block mb-0.5">
                    Branch
                  </span>
                  <span className="font-semibold text-[color:var(--ims-ink)] text-sm">
                    {lead.branch?.name || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[color:var(--ims-muted)] block mb-0.5">
                    Lead Source
                  </span>
                  <span className="font-semibold text-[color:var(--ims-ink)] text-sm">
                    {lead.source}
                  </span>
                </div>
                <div>
                  <span className="text-[color:var(--ims-muted)] block mb-0.5">
                    Assigned Counselor
                  </span>
                  <span className="font-semibold text-[color:var(--ims-ink)] text-sm">
                    {lead.counselor?.name || 'Unassigned'}
                  </span>
                </div>
                <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4 border-t border-slate-100 pt-4 mt-2">
                  <span className="text-[color:var(--ims-muted)] block mb-1">
                    Background Notes
                  </span>
                  <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap text-xs">
                    {lead.notes || 'No background notes provided.'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Student Registry & Enrollment Progress Console */}
        {(lead.stage === 'Converted' || lead.stage === 'Won') && (
          <div className="border border-[color:var(--ims-border)] p-6 rounded-2xl bg-white/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 text-[color:var(--ims-brass)] font-display">
                  <GraduationCap className="h-4.5 w-4.5" />
                  Student Registry & Enrollment Progress Console
                </h3>
                <p className="text-[11px] text-[color:var(--ims-muted)] mt-0.5">
                  Downstream handoff lifecycle tracking: admissions, enrollments, attendance, and finances.
                </p>
              </div>
            </div>

            <Tabs defaultValue="academic" className="space-y-4">
              <TabsList className="w-full flex-wrap justify-start rounded-2xl bg-slate-50 p-1 border border-slate-100">
                <TabsTrigger value="academic" className="gap-2 text-xs py-1.5 px-3">
                  <School className="h-3.5 w-3.5" />
                  Academic Handoff
                </TabsTrigger>
                <TabsTrigger value="attendance" className="gap-2 text-xs py-1.5 px-3">
                  <Activity className="h-3.5 w-3.5" />
                  Attendance & Progress
                </TabsTrigger>
                <TabsTrigger value="finance" className="gap-2 text-xs py-1.5 px-3">
                  <Compass className="h-3.5 w-3.5" />
                  Payments & Finance
                </TabsTrigger>
              </TabsList>

              {/* Tab: Academic Handoff */}
              <TabsContent value="academic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Admission Card */}
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-xs text-slate-700 flex items-center gap-1.5">
                        <School className="h-3.5 w-3.5 text-indigo-500" />
                        Admission Registry
                      </h4>
                      {admission ? (
                        <Badge variant={getAdmissionStatusBadge(admission.admissionStatus)} className="text-[10px] px-1.5 py-0">
                          {admission.admissionStatus}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">Not Generated</Badge>
                      )}
                    </div>
                    {admission ? (
                      <div className="text-xs space-y-1">
                        <div>
                          <span className="text-slate-500">Admission Num:</span>{" "}
                          <span className="font-mono font-bold text-slate-800">{admission.admissionNumber}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Admission Date:</span>{" "}
                          <span className="font-medium text-slate-700">{new Date(admission.admissionDate).toLocaleDateString()}</span>
                        </div>
                        {admission.approvedAt && (
                          <div>
                            <span className="text-slate-500">Approved On:</span>{" "}
                            <span className="font-medium text-slate-700">{new Date(admission.approvedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-slate-100 mt-2">
                          <Link href={`/admissions/${admission.id}`} className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1">
                            View Admission Details <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No admission record has been initialized for this lead.</p>
                    )}
                  </div>

                  {/* Enrollment Card */}
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-xs text-slate-700 flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-emerald-500" />
                        Course Enrollment
                      </h4>
                      {enrollment ? (
                        <Badge variant={getEnrollmentStatusBadge(enrollment.enrollmentStatus)} className="text-[10px] px-1.5 py-0">
                          {enrollment.enrollmentStatus}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">Not Enrolled</Badge>
                      )}
                    </div>
                    {enrollment ? (
                      <div className="text-xs space-y-1">
                        <div>
                          <span className="text-slate-500">Enrollment Num:</span>{" "}
                          <span className="font-mono font-bold text-slate-800">{enrollment.enrollmentNumber}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Enrollment Type:</span>{" "}
                          <span className="font-medium text-slate-700">{enrollment.enrollmentType}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Assigned Batch:</span>{" "}
                          <span className="font-mono text-slate-800 font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                            {enrollment.batch?.batchCode || 'Course Waitlist (No Batch)'}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-100 mt-2 flex justify-between items-center">
                          <Link href={`/enrollments/${enrollment.id}`} className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1">
                            View Enrollment Console <ExternalLink className="h-3 w-3" />
                          </Link>
                          {enrollment.studentProfileId && (
                            <Link href={`/students/${enrollment.studentProfileId}`} className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1">
                              Student Profile <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No enrollment record exists for this lead.</p>
                    )}
                  </div>

                  {/* Course Completion Card */}
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2.5">
                    <h4 className="font-semibold text-xs text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-amber-500" />
                      Course Completion Review
                    </h4>
                    {enrollment?.courseCompletion ? (
                      <div className="text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Overall Status:</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white">
                            {enrollment.courseCompletion.completionStatus}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[10px] text-center">
                          <div className="p-1 bg-white rounded border border-slate-100">
                            <span className="block text-[8px] uppercase tracking-wider text-slate-400">Attendance</span>
                            <span className={`font-bold ${enrollment.courseCompletion.attendanceOutcome === 'Pass' ? 'text-emerald-600' : 'text-slate-600'}`}>
                              {enrollment.courseCompletion.attendanceOutcome || 'Pending'}
                            </span>
                          </div>
                          <div className="p-1 bg-white rounded border border-slate-100">
                            <span className="block text-[8px] uppercase tracking-wider text-slate-400">Exam</span>
                            <span className={`font-bold ${enrollment.courseCompletion.examOutcome === 'Pass' ? 'text-emerald-600' : 'text-slate-600'}`}>
                              {enrollment.courseCompletion.examOutcome || 'Pending'}
                            </span>
                          </div>
                          <div className="p-1 bg-white rounded border border-slate-100">
                            <span className="block text-[8px] uppercase tracking-wider text-slate-400">Payment</span>
                            <span className={`font-bold ${enrollment.courseCompletion.paymentOutcome === 'Pass' ? 'text-emerald-600' : 'text-slate-600'}`}>
                              {enrollment.courseCompletion.paymentOutcome || 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No completion assessment exists yet.</p>
                    )}
                  </div>

                  {/* Certificate Generation Card */}
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2.5">
                    <h4 className="font-semibold text-xs text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <Award className="h-3.5 w-3.5 text-purple-500" />
                      Certificate Status
                    </h4>
                    {enrollment?.certificates && enrollment.certificates.length > 0 ? (
                      <div className="text-xs space-y-1.5">
                        {enrollment.certificates.map((cert: any) => (
                          <div key={cert.id} className="space-y-1 bg-white p-2 rounded border border-slate-100">
                            <div className="flex justify-between items-center">
                              <span className="font-mono font-bold text-slate-800 text-[11px]">{cert.certificateNumber}</span>
                              <Badge className="text-[8px] px-1 py-0">{cert.certificateStatus}</Badge>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Issued: {cert.issuedDate ? new Date(cert.issuedDate).toLocaleDateString() : 'N/A'}
                            </div>
                            {cert.certificateUrl && (
                              <a
                                href={`/api/v1/certificates/${cert.id}/download`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-0.5 mt-1"
                              >
                                <Eye className="h-3 w-3" /> View / Download Certificate
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic space-y-1">
                        <p>No certificates issued for this enrollment.</p>
                        <p className="text-[10px] text-slate-400">Status: {enrollment?.certificateStatus || 'NotEligible'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Tab: Attendance & Progress */}
              <TabsContent value="attendance" className="space-y-4">
                {enrollment?.attendance ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div className="md:col-span-1 flex flex-col items-center justify-center p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Attendance Rate</span>
                      <div className="relative flex items-center justify-center">
                        <div className="text-3xl font-extrabold text-indigo-600 font-display">
                          {enrollment.attendance.percentage}%
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-2 font-medium">
                        {enrollment.attendance.presentCount} / {enrollment.attendance.totalCount} Sessions Present
                      </span>
                    </div>

                    <div className="md:col-span-2 space-y-3">
                      <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5 text-slate-500" />
                        Recent Attendance Sessions
                      </h4>
                      {enrollment.attendance.logs.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No attendance records found yet.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden bg-white">
                          {enrollment.attendance.logs.map((log: any) => (
                            <div key={log.id} className="flex justify-between items-center p-2.5 text-xs">
                              <span className="text-slate-600">{new Date(log.date).toLocaleDateString()}</span>
                              <Badge
                                variant={
                                  log.status === 'Present'
                                    ? 'success'
                                    : log.status === 'Late'
                                      ? 'warning'
                                      : log.status === 'Absent'
                                        ? 'error'
                                        : 'outline'
                                }
                                className="text-[10px] px-1.5"
                              >
                                {log.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                      {enrollment.studentProfileId && (
                        <div className="pt-1">
                          <Link
                            href={`/students/${enrollment.studentProfileId}`}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                          >
                            View All Attendance Roster Details <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                    No enrollment or attendance details found for this lead.
                  </p>
                )}
              </TabsContent>

              {/* Tab: Payments & Finance */}
              <TabsContent value="finance" className="space-y-4">
                {enrollment ? (
                  sessionPermissions?.includes('finance.invoice.read') ? (
                    <div className="space-y-4">
                      {enrollment.invoices && enrollment.invoices.length > 0 ? (
                        <>
                          <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white">
                            <Table>
                              <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                  <TableHead className="text-xs">Invoice #</TableHead>
                                  <TableHead className="text-xs">Due Date</TableHead>
                                  <TableHead className="text-xs">Total Amount</TableHead>
                                  <TableHead className="text-xs">Paid</TableHead>
                                  <TableHead className="text-xs">Outstanding</TableHead>
                                  <TableHead className="text-xs">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {enrollment.invoices.map((inv: any) => (
                                  <TableRow key={inv.id}>
                                    <TableCell className="font-mono text-xs font-semibold">{inv.invoiceNumber}</TableCell>
                                    <TableCell className="text-xs">{new Date(inv.dueDate).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-xs">OMR {inv.totalAmount.toFixed(3)}</TableCell>
                                    <TableCell className="text-xs text-emerald-600">OMR {inv.paidAmount.toFixed(3)}</TableCell>
                                    <TableCell className="text-xs text-red-600">OMR {inv.outstandingAmount.toFixed(3)}</TableCell>
                                    <TableCell>
                                      <Badge variant={getInvoiceStatusBadge(inv.status)} className="text-[9px] px-1 py-0">
                                        {inv.status}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          <div className="pt-1 flex justify-between items-center text-xs">
                            <span className="text-slate-500">
                              Financial verification status is synced from the invoices registry.
                            </span>
                            {enrollment.studentProfileId && (
                              <Link
                                href={`/students/${enrollment.studentProfileId}`}
                                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                              >
                                View Financial Ledgers <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No invoice records generated for this enrollment.</p>
                      )}
                    </div>
                  ) : (
                    /* Counselor masked finance info */
                    <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl space-y-3">
                      <div className="flex items-start gap-2 text-xs text-amber-800">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Financial Access Restricted</p>
                          <p className="text-[11px] text-amber-700 mt-0.5">
                            You do not have permissions to view detailed invoice ledgers. A high-level payment status check is provided below.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-amber-100 pt-3 text-xs">
                        <div>
                          <span className="text-slate-500 block mb-0.5">Payment Validation Outcome:</span>
                          <span className={`font-bold ${enrollment.courseCompletion?.paymentOutcome === 'Pass' ? 'text-emerald-600' : 'text-slate-600'}`}>
                            {enrollment.courseCompletion?.paymentOutcome === 'Pass' ? 'Pass (Settled)' : 'Pending / Outstanding'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-0.5">Payment Validation Required:</span>
                          <span className="font-semibold text-slate-700">
                            {enrollment.paymentValidationRequired ? 'Yes (Enforced)' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <p className="text-xs text-slate-500 italic p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                    No enrollment details found to query billing.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Second Row: Follow-Up Engagements */}
        <div className="border border-[color:var(--ims-border)] p-6 rounded-2xl space-y-4 bg-white/80 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-[color:var(--ims-ink)] font-display">
              <ClipboardList className="h-4 w-4 text-[color:var(--ims-brass)]" />
              Follow-Up Engagements
            </h3>
            {lead.stage !== 'Converted' &&
              lead.stage !== 'Lost' &&
              lead.stage !== 'Won' && (
                <Button
                  size="sm"
                  className="text-[10px] h-7 px-2"
                  onClick={() => setShowScheduleDialog(true)}
                >
                  Schedule Follow-Up
                </Button>
              )}
          </div>

          <div className="space-y-4">
            {followUps.length === 0 ? (
              <EmptyState
                icon={
                  <ClipboardList className="h-6 w-6 text-[color:var(--ims-muted)]" />
                }
                title="No follow-up engagements"
                description="No scheduled or logged follow-ups exist for this prospect."
              />
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-[color:var(--ims-border)]">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Agenda / Outcome Notes</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {followUps.map((f: any) => (
                        <TableRow key={f.id}>
                          <TableCell className="whitespace-nowrap text-xs">
                            {new Date(f.followUpDate).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs">
                            {f.followUpType}
                          </TableCell>
                          <TableCell className="text-xs max-w-xs break-words">
                            <div className="font-semibold text-slate-700">
                              {f.agenda}
                            </div>
                            {f.notes && (
                              <div className="text-[10px] text-slate-500 mt-1 bg-slate-50 p-1.5 rounded border border-slate-100 italic">
                                Outcome: {f.outcome} — {f.notes}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                f.status === 'Completed'
                                  ? 'success'
                                  : f.status === 'Scheduled'
                                    ? 'warning'
                                    : f.status === 'Missed'
                                      ? 'error'
                                      : 'outline'
                              }
                              className="text-[10px] px-1.5 py-0.5"
                            >
                              {f.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {f.status === 'Scheduled' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[10px] h-6 px-2"
                                onClick={() => setActiveFollowUpId(f.id)}
                              >
                                Log Outcome
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Pagination
                  page={currentFollowUpPage}
                  totalPages={Math.ceil(followUpsTotal / 10)}
                  totalCount={followUpsTotal}
                  limit={10}
                  buildHref={(p) => {
                    const currentParams = new URLSearchParams(
                      searchParams.toString(),
                    );
                    currentParams.set('followUpPage', p.toString());
                    return `?${currentParams.toString()}`;
                  }}
                  pageSizeOptions={[10]}
                />
              </>
            )}
          </div>
        </div>

        {/* Third Row: Pipeline & Timeline Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Stage History Timeline */}
          <div className="lg:col-span-1 space-y-6">
            <div className="border border-[color:var(--ims-border)] p-6 rounded-2xl space-y-4 bg-white/80 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-[color:var(--ims-ink)] font-display">
                  <Activity className="h-4 w-4 text-[color:var(--ims-brass)]" />
                  Stage History Timeline
                </h3>
                {stageHistory.length + 1 > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px] h-6 px-2 hover:bg-slate-100 text-[color:var(--ims-brass)] border border-slate-200"
                    onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
                  >
                    {isTimelineExpanded
                      ? 'Collapse'
                      : `Show all (+${stageHistory.length + 1 - 2} more)`}
                  </Button>
                )}
              </div>

              {(() => {
                const creationEvent = {
                  id: 'creation',
                  performedAt: lead.createdAt,
                  performerName: lead.createdBy || 'System',
                  oldStage: 'None',
                  newStage: 'New',
                  lostReasonCode: null,
                  lostReasonNotes: null,
                  isCreation: true,
                };

                const fullTimeline = [creationEvent, ...stageHistory];
                const visibleTimeline = isTimelineExpanded
                  ? fullTimeline
                  : fullTimeline.slice(-2);

                return (
                  <div className="relative border-l-2 border-slate-200 ml-3 pl-6 space-y-6 my-4">
                    {visibleTimeline.map((event) => {
                      if ('isCreation' in event && event.isCreation) {
                        return (
                          <div key={event.id} className="relative">
                            <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-slate-200 bg-white ring-8 ring-white">
                              <span className="h-2 w-2 rounded-full bg-slate-400" />
                            </span>
                            <div>
                              <span className="text-xs font-semibold text-slate-800">
                                Lead created at stage{' '}
                                <Badge variant="default">New</Badge>
                              </span>
                              <span className="block text-[10px] text-[color:var(--ims-muted)] mt-1">
                                {new Date(event.performedAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={event.id} className="relative">
                          {/* Timeline circle marker */}
                          <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-slate-200 bg-white ring-8 ring-white">
                            <span className="h-2 w-2 rounded-full bg-[color:var(--ims-brass)]" />
                          </span>
                          <div className="flex flex-col md:flex-row md:justify-between gap-1">
                            <div>
                              <span className="text-xs font-semibold text-slate-800">
                                Stage updated from{' '}
                                <span className="font-mono bg-slate-100 px-1 rounded">
                                  {event.oldStage}
                                </span>{' '}
                                to{' '}
                                <Badge
                                  variant={getStageBadgeVariant(
                                    event.newStage,
                                  )}
                                >
                                  {event.newStage}
                                </Badge>
                              </span>
                              {event.lostReasonCode && (
                                <p className="text-[10px] text-[color:var(--ims-error)] font-medium mt-1">
                                  Reason: {event.lostReasonCode} -{' '}
                                  {event.lostReasonNotes}
                                </p>
                              )}
                            </div>
                            <div className="text-[10px] text-[color:var(--ims-muted)] md:text-right">
                              <span>By {event.performerName}</span>
                              <span className="block mt-0.5">
                                {new Date(event.performedAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right Column: Lead Timeline & Notes */}
          <div className="lg:col-span-2 space-y-6">
            <div className="border border-[color:var(--ims-border)] p-6 rounded-2xl space-y-4 bg-white/80 shadow-sm">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-[color:var(--ims-ink)] border-b border-slate-100 pb-2 font-display">
                <MessageSquare className="h-4 w-4 text-[color:var(--ims-brass)]" />
                Lead Timeline & Notes
              </h3>

              {lead.stage !== 'Converted' && (
                <form onSubmit={handleAddNote} className="space-y-3">
                  <FormField>
                    <FormLabel>Add Note</FormLabel>
                    <div className="flex gap-2">
                      <FormControl className="flex-1">
                        <Textarea
                          placeholder="Enter a new timeline note here. Once added, notes cannot be edited."
                          rows={2}
                          value={newNoteContent}
                          onChange={(e) => setNewNoteContent(e.target.value)}
                          disabled={isAddingNote}
                        />
                      </FormControl>
                      <Button
                        type="submit"
                        size="sm"
                        className="self-end h-10"
                        disabled={isAddingNote || !newNoteContent.trim()}
                      >
                        {isAddingNote ? 'Adding...' : 'Add'}
                      </Button>
                    </div>
                  </FormField>
                </form>
              )}

              <div className="mt-4">
                {localNotes.length === 0 ? (
                  <EmptyState
                    icon={
                      <MessageSquare className="h-6 w-6 text-[color:var(--ims-muted)]" />
                    }
                    title="No notes added"
                    description="Use the input above to post notes regarding client follow-ups."
                  />
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-xl border border-[color:var(--ims-border)]">
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow>
                            <TableHead className="w-1/2">
                              Note Details
                            </TableHead>
                            <TableHead>Added By</TableHead>
                            <TableHead>Added Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedNotes.map((note) => (
                            <TableRow key={note.id}>
                              <TableCell className="whitespace-pre-wrap text-slate-700 max-w-sm">
                                {note.content}
                              </TableCell>
                              <TableCell className="font-medium text-slate-900">
                                {note.authorName}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-slate-500">
                                {new Date(note.createdAt).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {totalNotesPages > 1 && (
                      <div className="flex justify-between items-center mt-4">
                        <span className="text-xs text-[color:var(--ims-muted)]">
                          Showing {(notesPage - 1) * notesLimit + 1} to{' '}
                          {Math.min(notesPage * notesLimit, localNotes.length)}{' '}
                          of {localNotes.length} notes
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={notesPage === 1}
                            onClick={() => setNotesPage((p) => p - 1)}
                          >
                            Previous
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={notesPage >= totalNotesPages}
                            onClick={() => setNotesPage((p) => p + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Audit Timestamps */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] text-[color:var(--ims-muted)] border-t border-[color:var(--ims-border)] pt-4">
          <div>
            <span>Created At</span>
            <span className="block font-semibold mt-0.5 text-slate-800">
              {new Date(lead.createdAt).toLocaleString()}
            </span>
          </div>
          <div>
            <span>Created By</span>
            <span className="block font-semibold mt-0.5 text-slate-800">
              {lead.createdBy || 'System'}
            </span>
          </div>
          <div>
            <span>Updated At</span>
            <span className="block font-semibold mt-0.5 text-slate-800">
              {lead.updatedAt
                ? new Date(lead.updatedAt).toLocaleString()
                : 'N/A'}
            </span>
          </div>
          <div>
            <span>Updated By</span>
            <span className="block font-semibold mt-0.5 text-slate-800">
              {lead.updatedBy || 'System'}
            </span>
          </div>
        </div>
      </div>


      {/* Schedule Follow-Up Dialog Modal */}
      <Dialog
        open={showScheduleDialog}
        onOpenChange={(open) => !open && setShowScheduleDialog(false)}
      >
        <DialogContent className="max-w-md bg-white border border-[color:var(--ims-border)] shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[color:var(--ims-ink)]">
              Schedule Follow-Up
            </DialogTitle>
            <DialogDescription className="text-xs text-[color:var(--ims-muted)]">
              Specify the date, communication type, and agenda for the next
              prospect engagement.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScheduleSubmit} className="space-y-4 py-2">
            {scheduleError && (
              <div className="text-xs bg-red-50 text-[color:var(--ims-error)] p-3 rounded-xl border border-[color:var(--ims-error-border)]">
                {scheduleError}
              </div>
            )}

            <FormField>
              <FormLabel required>Follow-Up Date & Time</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  required
                />
              </FormControl>
            </FormField>

            <FormField>
              <FormLabel required>Communication Channel</FormLabel>
              <FormControl>
                <Select
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value as any)}
                  options={[
                    { value: 'Call', label: 'Call' },
                    { value: 'WhatsApp', label: 'WhatsApp' },
                    { value: 'Email', label: 'Email' },
                    { value: 'Visit', label: 'In-person Visit' },
                  ]}
                />
              </FormControl>
            </FormField>

            <FormField>
              <FormLabel required>Agenda (Min 5 chars)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g. Discuss fee structures, follow up on civil ID upload request..."
                  value={scheduleAgenda}
                  onChange={(e) => setScheduleAgenda(e.target.value)}
                  rows={3}
                  required
                />
              </FormControl>
            </FormField>

            <DialogFooter className="mt-6 border-t border-[color:var(--ims-border)] pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowScheduleDialog(false)}
                disabled={isScheduling}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isScheduling || !scheduleDate || !scheduleAgenda.trim()
                }
              >
                {isScheduling ? 'Scheduling...' : 'Schedule Engagement'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Log Follow-Up Modal */}
      {activeFollowUpId && (
        <LogFollowUpModal
          followUpId={activeFollowUpId}
          leadVersion={lead.version}
          isOpen={!!activeFollowUpId}
          onOpenChange={(open) => !open && setActiveFollowUpId(null)}
        />
      )}
    </div>
  );
}
