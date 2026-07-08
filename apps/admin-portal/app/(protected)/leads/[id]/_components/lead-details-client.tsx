'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
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
} from '@ims/shared-ui';
import {
  convertLeadAction,
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
  Eye,
  MessageSquare,
  ChevronDown,
  ChevronUp,
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
}

export function LeadDetailsClient({
  lead: initialLead,
  notes,
  stageHistory,
  followUps,
  followUpsTotal,
  currentFollowUpPage,
  admissionId: initialAdmissionId,
  initialDocuments = [],
}: LeadDetailsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lead, setLead] = useState(initialLead);
  const [admissionId, setAdmissionId] = useState(initialAdmissionId);
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);

  // Convert Dialog State
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<
    Record<string, { url: string; fileName: string; id?: string }>
  >({});
  const [uploadingStates, setUploadingStates] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    setLead(initialLead);
    setAdmissionId(initialAdmissionId);

    const initialMap: Record<
      string,
      { url: string; fileName: string; id?: string }
    > = {};
    for (const doc of initialDocuments) {
      initialMap[doc.documentType] = {
        url: doc.fileKey,
        fileName: doc.fileName,
        id: doc.id,
      };
    }
    setUploadedFiles(initialMap);
  }, [initialLead, initialAdmissionId, initialDocuments]);

  // Fetch dynamic requirements checklist
  useEffect(() => {
    if (!showConvertDialog) return;
    const fetchReqs = async () => {
      try {
        const res = await fetch(
          `/api/v1/documents/requirements?targetEntity=STUDENT&branchId=${lead.branchId}&courseId=${lead.interestedCourseId || ''}`,
        );
        if (res.ok) {
          const result = await res.json();
          setRequirements(result.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch requirements', err);
      }
    };
    fetchReqs();
  }, [showConvertDialog, lead]);

  const handleLeadDocUpload = async (
    documentType: string,
    file: File | undefined,
  ) => {
    if (!file) return;

    setUploadingStates((prev) => ({ ...prev, [documentType]: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('ownerId', lead.personId);
      formData.append('documentType', documentType);
      formData.append('branchId', lead.branchId);

      const res = await fetch('/api/v1/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.messageEnglish || 'Failed to upload file');
      }

      setUploadedFiles((prev) => ({
        ...prev,
        [documentType]: {
          url: result.data.url,
          fileName: result.data.fileName,
          id: result.data.id,
        },
      }));
      toast.success(`Uploaded ${result.data.fileName} successfully!`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'File upload failed');
    } finally {
      setUploadingStates((prev) => ({ ...prev, [documentType]: false }));
    }
  };

  const handleClearDoc = async (documentType: string) => {
    const targetFile = uploadedFiles[documentType];
    if (!targetFile) return;

    if (
      !confirm(
        'Are you sure you want to delete this document? The entire document will be deleted.',
      )
    ) {
      return;
    }

    if (targetFile.id) {
      try {
        const res = await fetch(`/api/v1/documents/${targetFile.id}`, {
          method: 'DELETE',
        });
        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.messageEnglish || 'Failed to delete document');
        }
        toast.success('Document deleted successfully!');
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete document');
        return;
      }
    }

    setUploadedFiles((prev) => {
      const copy = { ...prev };
      delete copy[documentType];
      return copy;
    });
    router.refresh();
  };

  const [docError, setDocError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocError(null);

    const missingMandatory = requirements
      .filter((r) => r.isMandatory && !uploadedFiles[r.documentType])
      .map((r) => r.documentType.replace(/_/g, ' '));

    if (missingMandatory.length > 0) {
      setDocError(
        `The following required documents are missing: ${missingMandatory.join(', ')}`,
      );
      return;
    }

    try {
      setIsConverting(true);
      const docsPayload = Object.entries(uploadedFiles).map(([docType, f]) => ({
        documentType: docType,
        fileKey: f.url,
        fileName: f.fileName,
        fileType: 'application/pdf', // fallback
        expiryDate: null,
      }));

      const response = await convertLeadAction(lead.id, docsPayload);
      const res = response as any;
      if (res && !res.success) {
        setDocError(
          res.error ||
            'Conversion failed. Make sure lead has valid DOB and Email.',
        );
      } else {
        toast.success('Lead converted to student successfully!');
        setShowConvertDialog(false);
        setUploadedFiles({});
        const createdAdmissionId = res.data?.admissionId;
        if (createdAdmissionId) {
          setAdmissionId(createdAdmissionId);
        }
        setLead({ ...lead, stage: 'Converted' });
        router.refresh();
      }
    } catch (err: any) {
      setDocError(err.message || 'An unexpected conversion error occurred.');
    } finally {
      setIsConverting(false);
    }
  }; // Notes State
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
            {lead.stage !== 'Converted' && (
              <Button
                size="sm"
                className="gap-2 bg-[color:var(--ims-ink)] hover:bg-[color:var(--ims-brass)] text-white"
                onClick={() => setShowConvertDialog(true)}
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
              <span className="text-[color:var(--ims-muted)] block mb-0.5">Full Name</span>
              <span className="font-semibold text-[color:var(--ims-ink)] text-sm">{lead.firstName} {lead.lastName}</span>
            </div>
            <div>
              <span className="text-[color:var(--ims-muted)] block mb-0.5">Phone Number</span>
              <span className="font-semibold text-[color:var(--ims-ink)] text-sm">{lead.phone}</span>
            </div>
            <div>
              <span className="text-[color:var(--ims-muted)] block mb-0.5">Email Address</span>
              <span className="font-semibold text-[color:var(--ims-ink)] text-sm">{lead.email || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[color:var(--ims-muted)] block mb-0.5">Interested Course</span>
              <span className="font-semibold text-[color:var(--ims-ink)] text-sm">
                {lead.interestedCourse?.nameEnglish || lead.interestedCourseId}
              </span>
            </div>

            {isProfileExpanded && (
              <>
                <div>
                  <span className="text-[color:var(--ims-muted)] block mb-0.5">Date of Birth</span>
                  <span className="font-semibold text-[color:var(--ims-ink)] text-sm">
                    {lead.person?.dateOfBirth ? new Date(lead.person.dateOfBirth).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[color:var(--ims-muted)] block mb-0.5">Nationality</span>
                  <span className="font-semibold text-[color:var(--ims-ink)] text-sm">
                    {lead.nationality || lead.person?.nationality || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[color:var(--ims-muted)] block mb-0.5">ID Number</span>
                  <span className="font-semibold text-[color:var(--ims-ink)] text-sm">
                    {lead.nationalId || lead.person?.nationalId || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[color:var(--ims-muted)] block mb-0.5">Branch</span>
                  <span className="font-semibold text-[color:var(--ims-ink)] text-sm">{lead.branch?.name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[color:var(--ims-muted)] block mb-0.5">Lead Source</span>
                  <span className="font-semibold text-[color:var(--ims-ink)] text-sm">{lead.source}</span>
                </div>
                <div>
                  <span className="text-[color:var(--ims-muted)] block mb-0.5">Assigned Counselor</span>
                  <span className="font-semibold text-[color:var(--ims-ink)] text-sm">
                    {lead.counselor?.name || 'Unassigned'}
                  </span>
                </div>
                <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4 border-t border-slate-100 pt-4 mt-2">
                  <span className="text-[color:var(--ims-muted)] block mb-1">Background Notes</span>
                  <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap text-xs">
                    {lead.notes || 'No background notes provided.'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

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
          {/* Left Column: Pipeline Status & Stage History */}
          <div className="lg:col-span-1 space-y-6">
            <div className="border border-[color:var(--ims-border)] p-6 rounded-2xl space-y-4 bg-white/80 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-[color:var(--ims-ink)] font-display">
                  <Activity className="h-4 w-4 text-[color:var(--ims-brass)]" />
                  Pipeline Status
                </h3>
                {!isEditingStage && lead.stage !== 'Converted' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-7 px-2"
                    onClick={() => {
                      setStageValue(lead.stage);
                      setLostCodeValue(lead.lostReasonCode || '');
                      setLostNotesValue(lead.lostReasonNotes || '');
                      setIsEditingStage(true);
                    }}
                  >
                    Change Stage
                  </Button>
                )}
              </div>

              {isEditingStage ? (
                <form
                  onSubmit={handleStageUpdate}
                  className="space-y-4 max-w-lg text-xs"
                >
                  {stageError && (
                    <div className="p-2 bg-red-50 border border-red-200 text-[color:var(--ims-error)] rounded-lg text-xs">
                      {stageError}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            { value: 'TimingNotGood', label: 'Timing not good' },
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

                  <div className="flex gap-2">
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
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[color:var(--ims-muted)] block mb-1">
                        Current Stage
                      </span>
                      <Badge
                        variant={getStageBadgeVariant(lead.stage)}
                        className="text-xs px-2.5 py-1"
                      >
                        {lead.stage}
                      </Badge>
                    </div>
                    {lead.priority && (
                      <div>
                        <span className="text-[color:var(--ims-muted)] block mb-1">
                          Priority
                        </span>
                        <span className="font-semibold text-[color:var(--ims-ink)]">
                          {lead.priority}
                        </span>
                      </div>
                    )}
                  </div>
                  {lead.stage === 'Lost' && (
                    <div className="p-3 bg-red-50/50 border border-red-100 rounded-lg space-y-2 text-xs">
                      <div>
                        <span className="font-bold text-[color:var(--ims-error)]">
                          Lost Reason Code:
                        </span>{' '}
                        <span className="font-semibold text-[color:var(--ims-ink)]">
                          {lead.lostReasonCode || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-[color:var(--ims-error)]">
                          Lost Explanatory Notes:
                        </span>
                        <p className="mt-1 text-slate-600 bg-white p-2 rounded border border-slate-100 whitespace-pre-wrap">
                          {lead.lostReasonNotes || 'No explanatory notes provided.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Chronological Stage History Timeline Chart */}
              <div className="mt-6 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-[color:var(--ims-ink)] uppercase tracking-wider font-display">
                    Stage History Timeline
                  </h4>
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
                                    variant={getStageBadgeVariant(event.newStage)}
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
                            <TableHead className="w-1/2">Note Details</TableHead>
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
                          {Math.min(notesPage * notesLimit, localNotes.length)} of{' '}
                          {localNotes.length} notes
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

      {/* Convert Lead Dialog Modal */}
      <Dialog
        open={showConvertDialog}
        onOpenChange={(open) => !open && setShowConvertDialog(false)}
      >
        <DialogContent className="max-w-md bg-white border border-[color:var(--ims-border)] shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[color:var(--ims-ink)]">
              Convert Lead to Student
            </DialogTitle>
            <DialogDescription className="text-xs text-[color:var(--ims-muted)]">
              To complete the admissions handoff, please upload or enter URL
              links for at least one identity document (e.g., Omani Civil ID
              scan, passport copy).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConvertSubmit} className="space-y-4 py-2">
            {docError && (
              <div className="text-xs bg-red-50 text-[color:var(--ims-error)] p-3 rounded-xl border border-[color:var(--ims-error-border)]">
                {docError}
              </div>
            )}

            {requirements.map((req) => {
              const file = uploadedFiles[req.documentType];
              const isUploading = uploadingStates[req.documentType];
              return (
                <FormField key={req.documentType}>
                  <FormLabel required={req.isMandatory}>
                    {req.documentType.replace(/_/g, ' ')}{' '}
                    {req.isMandatory ? '' : '(Optional)'}
                  </FormLabel>
                  <FormControl>
                    {file ? (
                      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs">
                        <span className="truncate max-w-[200px] font-mono font-medium">
                          {file.fileName}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleClearDoc(req.documentType)}
                          className="h-5 px-1.5 text-xs text-rose-600 hover:bg-rose-50"
                          disabled={isConverting}
                        >
                          Clear
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <input
                          type="file"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            handleLeadDocUpload(req.documentType, f);
                          }}
                          disabled={isConverting || isUploading}
                          className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                        />
                        {isUploading && (
                          <span className="text-[10px] text-slate-500 italic">
                            Uploading to store...
                          </span>
                        )}
                      </div>
                    )}
                  </FormControl>
                </FormField>
              );
            })}

            <DialogFooter className="mt-6 border-t border-[color:var(--ims-border)] pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowConvertDialog(false)}
                disabled={isConverting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isConverting}>
                {isConverting ? 'Converting...' : 'Complete Admissions Handoff'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
