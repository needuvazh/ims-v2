'use client';

import { useState } from 'react';
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
import { convertLeadAction, addLeadNoteAction, updateLeadStageAction } from '../../actions';
import {
  Pencil,
  UserCheck,
  User,
  Compass,
  Activity,
  FileText,
  Home,
  ClipboardList,
  Eye,
  History,
  Check,
  X,
  MessageSquare,
} from 'lucide-react';

interface LeadNoteDto {
  id: string;
  content: string;
  createdAt: string;
  authorName: string;
}

interface AuditLogDto {
  id: string;
  action: string;
  performedAt: string;
  performerName: string;
  oldValue: string | null;
  newValue: string | null;
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
  sessionUserId: string;
  notes: LeadNoteDto[];
  stageHistory: LeadStageHistoryDto[];
  auditLogs: AuditLogDto[];
  auditTotal: number;
  currentAuditPage: number;
}

export function LeadDetailsClient({
  lead: initialLead,
  sessionUserId,
  notes,
  stageHistory,
  auditLogs,
  auditTotal,
  currentAuditPage,
}: LeadDetailsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lead, setLead] = useState(initialLead);
  
  // Convert Dialog State
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [docLink1, setDocLink1] = useState('');
  const [docLink2, setDocLink2] = useState('');
  const [docError, setDocError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

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
  const [lostNotesValue, setLostNotesValue] = useState(lead.lostReasonNotes || '');
  const [isSavingStage, setIsSavingStage] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);

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

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocError(null);

    if (!docLink1.trim()) {
      setDocError('At least one identity document URL (e.g. Civil ID scan link) is mandatory.');
      return;
    }

    try {
      setIsConverting(true);
      const links = [docLink1.trim()];
      if (docLink2.trim()) {
        links.push(docLink2.trim());
      }

      const response = await convertLeadAction(lead.id, links);
      const res = response as any;
      if (res && !res.success) {
        setDocError(res.error || 'Conversion failed. Make sure lead has valid DOB and Email.');
      } else {
        toast.success('Lead converted to student successfully!');
        setShowConvertDialog(false);
        setDocLink1('');
        setDocLink2('');
        setLead({ ...lead, stage: 'Converted' });
        router.refresh();
      }
    } catch (err: any) {
      setDocError(err.message || 'An unexpected conversion error occurred.');
    } finally {
      setIsConverting(false);
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
      const res = await updateLeadStageAction(
        lead.id,
        stageValue,
        stageValue === 'Lost' ? lostCodeValue : undefined,
        stageValue === 'Lost' ? lostNotesValue.trim() : undefined
      );

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

  // Client Side Notes Pagination
  const notesLimit = 5;
  const totalNotesPages = Math.ceil(localNotes.length / notesLimit);
  const paginatedNotes = localNotes.slice((notesPage - 1) * notesLimit, notesPage * notesLimit);

  // Render audit changes helper
  const renderAuditDetails = (log: AuditLogDto) => {
    try {
      const oldVal = log.oldValue ? JSON.parse(log.oldValue) : null;
      const newVal = log.newValue ? JSON.parse(log.newValue) : null;
      
      if (log.action === 'UPDATE_STAGE') {
        return `Stage updated from '${oldVal?.stage || 'N/A'}' to '${newVal?.stage || 'N/A'}'${
          newVal?.lostReasonCode ? ` (Reason: ${newVal.lostReasonCode})` : ''
        }`;
      }
      if (log.action === 'ADD_NOTE') {
        return `Added note: "${newVal?.content || ''}"`;
      }
      if (oldVal || newVal) {
        return `Old: ${JSON.stringify(oldVal)} | New: ${JSON.stringify(newVal)}`;
      }
      return '—';
    } catch {
      return log.newValue || log.oldValue || '—';
    }
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
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5" /> },
              { label: 'Leads', href: '/leads', icon: <ClipboardList className="h-3.5 w-3.5" /> },
              { label: 'Details', icon: <Eye className="h-3.5 w-3.5" /> },
            ]}
          />
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => router.push(`/leads/${lead.id}/edit`)}
            >
              <Pencil className="h-4 w-4" />
              Edit Details
            </Button>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Information */}
          <div className="lg:col-span-2 border border-[color:var(--ims-border)] p-6 rounded-2xl space-y-4 bg-white/80 shadow-sm">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-[color:var(--ims-ink)] border-b border-slate-100 pb-2 font-display">
              <User className="h-4 w-4 text-[color:var(--ims-brass)]" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[color:var(--ims-muted)] block">First Name</span>
                <span className="font-semibold text-[color:var(--ims-ink)]">{lead.firstName}</span>
              </div>
              <div>
                <span className="text-[color:var(--ims-muted)] block">Last Name</span>
                <span className="font-semibold text-[color:var(--ims-ink)]">{lead.lastName}</span>
              </div>
              <div>
                <span className="text-[color:var(--ims-muted)] block">Phone Number</span>
                <span className="font-semibold text-[color:var(--ims-ink)]">{lead.phone}</span>
              </div>
              <div>
                <span className="text-[color:var(--ims-muted)] block">Email Address</span>
                <span className="font-semibold text-[color:var(--ims-ink)]">{lead.email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[color:var(--ims-muted)] block">Date of Birth</span>
                <span className="font-semibold text-[color:var(--ims-ink)]">
                  {lead.dateOfBirth ? new Date(lead.dateOfBirth).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Lead Assignment & Interest */}
          <div className="border border-[color:var(--ims-border)] p-6 rounded-2xl space-y-4 bg-white/80 shadow-sm">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-[color:var(--ims-ink)] border-b border-slate-100 pb-2 font-display">
              <Compass className="h-4 w-4 text-[color:var(--ims-brass)]" />
              Assignment & Interest
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[color:var(--ims-muted)] block">Branch</span>
                <span className="font-semibold text-[color:var(--ims-ink)]">{lead.branch?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[color:var(--ims-muted)] block">Interested Course</span>
                <span className="font-semibold text-[color:var(--ims-ink)]">
                  {lead.interestedCourse?.nameEnglish || lead.interestedCourseId}
                </span>
              </div>
              <div>
                <span className="text-[color:var(--ims-muted)] block">Lead Source</span>
                <span className="font-semibold text-[color:var(--ims-ink)]">{lead.source}</span>
              </div>
              <div>
                <span className="text-[color:var(--ims-muted)] block">Assigned Counselor</span>
                <span className="font-semibold text-[color:var(--ims-ink)]">
                  {lead.counselor?.name || 'Unassigned'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Status with interactive direct updates */}
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
            <form onSubmit={handleStageUpdate} className="space-y-4 max-w-lg text-xs">
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
                      { value: 'FollowUp', label: 'FollowUp' },
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
                        { value: 'CompetitorChosen', label: 'Chose competitor' },
                        { value: 'TimingNotGood', label: 'Timing not good' },
                        { value: 'NoResponse', label: 'Lost contact / no response' },
                        { value: 'Other', label: 'Other reason' },
                      ]}
                    />
                  </FormField>
                  <FormField>
                    <FormLabel required>Lost Details (Min 15 characters)</FormLabel>
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
                  <span className="text-[color:var(--ims-muted)] block mb-1">Current Stage</span>
                  <Badge variant={getStageBadgeVariant(lead.stage)} className="text-xs px-2.5 py-1">
                    {lead.stage}
                  </Badge>
                </div>
                {lead.priority && (
                  <div>
                    <span className="text-[color:var(--ims-muted)] block mb-1">Priority</span>
                    <span className="font-semibold text-[color:var(--ims-ink)]">{lead.priority}</span>
                  </div>
                )}
              </div>
              {lead.stage === 'Lost' && (
                <div className="p-3 bg-red-50/50 border border-red-100 rounded-lg space-y-2 text-xs">
                  <div>
                    <span className="font-bold text-[color:var(--ims-error)]">Lost Reason Code:</span>{' '}
                    <span className="font-semibold text-[color:var(--ims-ink)]">{lead.lostReasonCode || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[color:var(--ims-error)]">Lost Explanatory Notes:</span>
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
                  {isTimelineExpanded ? 'Collapse' : `Show all (+${stageHistory.length + 1 - 2} more)`}
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
              const visibleTimeline = isTimelineExpanded ? fullTimeline : fullTimeline.slice(-2);

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
                              Lead created at stage <Badge variant="default">New</Badge>
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
                              Stage updated from <span className="font-mono bg-slate-100 px-1 rounded">{event.oldStage}</span> to <Badge variant={getStageBadgeVariant(event.newStage)}>{event.newStage}</Badge>
                            </span>
                            {event.lostReasonCode && (
                              <p className="text-[10px] text-[color:var(--ims-error)] font-medium mt-1">
                                Reason: {event.lostReasonCode} - {event.lostReasonNotes}
                              </p>
                            )}
                          </div>
                          <div className="text-[10px] text-[color:var(--ims-muted)] md:text-right">
                            <span>By {event.performerName}</span>
                            <span className="block mt-0.5">{new Date(event.performedAt).toLocaleString()}</span>
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

        {/* Lead Notes Section (Multiple notes adding and paginated table view) */}
        <div className="border border-[color:var(--ims-border)] p-6 rounded-2xl space-y-4 bg-white/80 shadow-sm">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-[color:var(--ims-ink)] border-b border-slate-100 pb-2 font-display">
            <MessageSquare className="h-4 w-4 text-[color:var(--ims-brass)]" />
            Lead Timeline & Notes
          </h3>

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

          <div className="mt-4">
            {localNotes.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="h-6 w-6 text-[color:var(--ims-muted)]" />}
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
                          <TableCell className="font-medium text-slate-900">{note.authorName}</TableCell>
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
                      {Math.min(notesPage * notesLimit, localNotes.length)} of {localNotes.length} notes
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

        {/* Audit History Timeline with server-side pagination */}
        <div className="border border-[color:var(--ims-border)] p-6 rounded-2xl space-y-4 bg-white/80 shadow-sm">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-[color:var(--ims-ink)] border-b border-slate-100 pb-2 font-display">
            <History className="h-4 w-4 text-[color:var(--ims-brass)]" />
            Audit History Log
          </h3>

          {auditLogs.length === 0 ? (
            <EmptyState
              icon={<History className="h-6 w-6 text-[color:var(--ims-muted)]" />}
              title="No audit entries"
              description="No status transitions or data updates are logged yet."
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-[color:var(--ims-border)]">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead>Event Type / Action</TableHead>
                      <TableHead>Details & Changes</TableHead>
                      <TableHead>User Performed</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-[10px] font-bold text-slate-800">
                          {log.action}
                        </TableCell>
                        <TableCell className="text-slate-600 max-w-md break-words">
                          {renderAuditDetails(log)}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900">{log.performerName}</TableCell>
                        <TableCell className="whitespace-nowrap text-slate-500">
                          {new Date(log.performedAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Pagination
                page={currentAuditPage}
                totalPages={Math.ceil(auditTotal / 5)}
                totalCount={auditTotal}
                limit={5}
                buildHref={(p) => {
                  const currentParams = new URLSearchParams(searchParams.toString());
                  currentParams.set('auditPage', p.toString());
                  return `?${currentParams.toString()}`;
                }}
                pageSizeOptions={[5]}
              />
            </>
          )}
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
            <span className="block font-semibold mt-0.5 text-slate-800">{lead.createdBy || 'System'}</span>
          </div>
          <div>
            <span>Updated At</span>
            <span className="block font-semibold mt-0.5 text-slate-800">
              {lead.updatedAt ? new Date(lead.updatedAt).toLocaleString() : 'N/A'}
            </span>
          </div>
          <div>
            <span>Updated By</span>
            <span className="block font-semibold mt-0.5 text-slate-800">{lead.updatedBy || 'System'}</span>
          </div>
        </div>
      </div>

      {/* Convert Lead Dialog Modal */}
      <Dialog open={showConvertDialog} onOpenChange={(open) => !open && setShowConvertDialog(false)}>
        <DialogContent className="max-w-md bg-white border border-[color:var(--ims-border)] shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[color:var(--ims-ink)]">Convert Lead to Student</DialogTitle>
            <DialogDescription className="text-xs text-[color:var(--ims-muted)]">
              To complete the admissions handoff, please upload or enter URL links for at least one identity document
              (e.g., Omani Civil ID scan, passport copy).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConvertSubmit} className="space-y-4 py-2">
            {docError && (
              <div className="text-xs bg-red-50 text-[color:var(--ims-error)] p-3 rounded-xl border border-[color:var(--ims-error-border)]">
                {docError}
              </div>
            )}

            <FormField>
              <FormLabel required>Identity Document URL (Civil ID Scan)</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://storage.example.com/docs/civil_id.pdf"
                  value={docLink1}
                  onChange={(e) => setDocLink1(e.target.value)}
                  required
                />
              </FormControl>
              <span className="text-[10px] text-[color:var(--ims-muted)]">
                Civil ID scan or equivalent national registration document.
              </span>
            </FormField>

            <FormField>
              <FormLabel>Secondary Document URL (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://storage.example.com/docs/passport.pdf"
                  value={docLink2}
                  onChange={(e) => setDocLink2(e.target.value)}
                />
              </FormControl>
            </FormField>

            <DialogFooter className="mt-6 border-t border-[color:var(--ims-border)] pt-4">
              <Button type="button" variant="ghost" onClick={() => setShowConvertDialog(false)} disabled={isConverting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isConverting || !docLink1.trim()}>
                {isConverting ? 'Converting...' : 'Complete Admissions Handoff'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
