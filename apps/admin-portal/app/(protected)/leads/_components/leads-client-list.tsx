'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { User, Compass, Activity, FileText, Eye, Pencil, UserCheck } from 'lucide-react';
import {
  Badge,
  Button,
  Pagination,
  DataTableFilter,
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
  FormError,
  SimpleTooltip,
  ResponsiveDataTable,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  EmptyState
} from '@ims/shared-ui';
import { LeadForm } from './lead-form';
import { createLeadAction, updateLeadAction, convertLeadAction } from '../actions';

interface LeadsClientListProps {
  leads: any[];
  branches: any[];
  counselors: any[];
  courses: any[];
  total: number;
  sessionUserId: string;
}

export function LeadsClientList({
  leads,
  branches,
  counselors,
  courses,
  total,
  sessionUserId,
}: LeadsClientListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPage = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const totalPages = Math.ceil(total / 10);

  // Modal Dialog States
  const [convertingLead, setConvertingLead] = useState<any | null>(null);

  // Conversion Document Links State
  const [docLink1, setDocLink1] = useState('');
  const [docLink2, setDocLink2] = useState('');
  const [docError, setDocError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  // DataTable Filters Setup
  const filterConfigs = [
    {
      key: 'branchId',
      label: 'Branch',
      options: branches.map((b) => ({ value: b.id, label: b.name })),
    },
    {
      key: 'stage',
      label: 'Stage',
      options: [
        { value: 'New', label: 'New' },
        { value: 'FollowUp', label: 'FollowUp' },
        { value: 'Won', label: 'Won' },
        { value: 'Lost', label: 'Lost' },
        { value: 'Converted', label: 'Converted' },
      ],
    },
    {
      key: 'source',
      label: 'Source',
      options: [
        { value: 'WalkIn', label: 'Walk-In' },
        { value: 'SocialMedia', label: 'Social Media' },
        { value: 'Website', label: 'Website' },
        { value: 'Referral', label: 'Referral' },
        { value: 'Campaign', label: 'Campaign' },
        { value: 'Other', label: 'Other' },
      ],
    },
  ];

  const getStageBadgeVariant = (stage: string) => {
    switch (stage) {
      case 'New':
        return 'default';
      case 'FollowUp':
        return 'info';
      case 'Won':
        return 'success';
      case 'Lost':
        return 'error';
      case 'Converted':
        return 'outline';
      default:
        return 'default';
    }
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocError(null);

    if (!docLink1.trim()) {
      setDocError('At least one identity document URL (e.g. National ID scan link) is mandatory.');
      return;
    }

    try {
      setIsConverting(true);
      const links = [docLink1.trim()];
      if (docLink2.trim()) {
        links.push(docLink2.trim());
      }

      const response = await convertLeadAction(convertingLead.id, links);
      const res = response as any;
      if (res && !res.success) {
        setDocError(res.error || 'Conversion failed. Make sure lead has valid DOB and Email.');
      } else {
        toast.success('Lead converted to student successfully!');
        setConvertingLead(null);
        setDocLink1('');
        setDocLink2('');
        router.refresh();
      }
    } catch (err: any) {
      setDocError(err.message || 'An unexpected conversion error occurred.');
    } finally {
      setIsConverting(false);
    }
  };

  const columns = [
    { header: 'Lead Number', render: (lead: any) => <span className="font-semibold text-xs tracking-wider">{lead.leadNumber}</span> },
    { header: 'Name', render: (lead: any) => <span>{lead.firstName} {lead.lastName}</span> },
    { header: 'Phone', render: (lead: any) => lead.phone },
    { header: 'Email', render: (lead: any) => lead.email || <span className="text-xs text-[var(--ims-muted)] italic">N/A</span> },
    { header: 'Branch', render: (lead: any) => lead.branch?.name },
    { header: 'Course', render: (lead: any) => lead.interestedCourse?.nameEnglish || lead.interestedCourseId },
    { header: 'Stage', render: (lead: any) => <Badge variant={getStageBadgeVariant(lead.stage)}>{lead.stage}</Badge> },
    {
      header: 'Actions',
      className: 'text-right',
      render: (lead: any) => (
        <div className="flex items-center justify-end gap-2">
          <SimpleTooltip content="View Details">
            <Button
              variant="outline"
              className="h-8 w-8 p-0 flex items-center justify-center"
              onClick={() => router.push(`/leads/${lead.id}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </SimpleTooltip>

          <SimpleTooltip content="Edit Details">
            <Button
              variant="outline"
              className="h-8 w-8 p-0 flex items-center justify-center"
              onClick={() => router.push(`/leads/${lead.id}/edit`)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </SimpleTooltip>

          {lead.stage !== 'Converted' && (
            <SimpleTooltip content="Convert to Student">
              <Button
                className="h-8 w-8 p-0 flex items-center justify-center bg-[var(--ims-ink)] hover:bg-[var(--ims-brass)] text-white"
                onClick={() => setConvertingLead(lead)}
              >
                <UserCheck className="h-4 w-4" />
              </Button>
            </SimpleTooltip>
          )}
        </div>
      )
    }
  ];

  const renderCard = (lead: any) => (
    <Card className="hover:border-[var(--ims-brass)] transition-colors">
      <CardHeader className="p-card-p border-b border-slate-100 bg-slate-50/50">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">
              {lead.leadNumber}
            </p>
            <p className="text-sm font-bold text-[var(--ims-ink)]">
              {lead.firstName} {lead.lastName}
            </p>
          </div>
          <Badge variant={getStageBadgeVariant(lead.stage)}>{lead.stage}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-card-p space-y-3">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Phone</p>
            <p>{lead.phone}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Branch</p>
            <p className="truncate">{lead.branch?.name}</p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Email</p>
            <p className="truncate">{lead.email || 'N/A'}</p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Interested Course</p>
            <p className="truncate">{lead.interestedCourse?.nameEnglish || lead.interestedCourseId}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-[11px]"
          onClick={() => router.push(`/leads/${lead.id}`)}
        >
          <Eye className="h-3.5 w-3.5 mr-1.5" /> View
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-[11px]"
          onClick={() => router.push(`/leads/${lead.id}/edit`)}
        >
          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
        </Button>
        {lead.stage !== 'Converted' && (
          <Button
            size="sm"
            className="flex-1 text-[11px] bg-[var(--ims-ink)] text-white"
            onClick={() => setConvertingLead(lead)}
          >
            <UserCheck className="h-3.5 w-3.5 mr-1.5" /> Convert
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-page-title font-bold tracking-tight text-[var(--ims-ink)]">Leads</h1>
          <p className="text-sm text-[var(--ims-muted)]">
            Manage customer acquisition, follow-ups, and student onboarding pipeline.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => router.push('/leads/create')}>Create Lead</Button>
      </div>

      {/* Scoped Filters */}
      <DataTableFilter searchPlaceholder="Search leads by name, phone, or email..." filters={filterConfigs} />

      {/* Leads Data */}
      <ResponsiveDataTable
        data={leads}
        columns={columns}
        renderCard={renderCard}
        keyExtractor={(lead) => lead.id}
        emptyState={
          <EmptyState
            icon={<User className="h-6 w-6" />}
            title="No leads found"
            description="No active leads match your current filter criteria."
          />
        }
      />

      {/* Pagination */}
      {totalPages > 1 && <Pagination page={currentPage} totalPages={totalPages} totalCount={total} limit={10} />}



      {/* Convert Lead Dialog Modal */}
      <Dialog open={!!convertingLead} onOpenChange={(open) => !open && setConvertingLead(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convert Lead to Student</DialogTitle>
            <DialogDescription>
              To complete the admissions handoff, please upload or enter URL links for at least one identity document
              (e.g., Omani Civil ID scan, passport copy).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConvertSubmit} className="space-y-4 py-2">
            {docError && (
              <div className="text-xs bg-red-50 text-[color:var(--ims-error)] p-3 rounded-lg border border-[color:var(--ims-error-border)]">
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConvertingLead(null)} disabled={isConverting}>
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
