'use client';

import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
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
} from '@ims/shared-ui';

interface InquiriesClientListProps {
  inquiries: any[];
  branches: any[];
  total: number;
}

export function InquiriesClientList({ inquiries, branches, total }: InquiriesClientListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPage = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const totalPages = Math.ceil(total / 10);

  const [qualifyingInquiry, setQualifyingInquiry] = useState<any | null>(null);
  const [interestedCourseId, setInterestedCourseId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filterConfigs = [
    {
      key: 'branchId',
      label: 'Branch',
      options: branches.map((b) => ({ value: b.id, label: b.name })),
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'New', label: 'New' },
        { value: 'Qualified', label: 'Qualified' },
        { value: 'Rejected', label: 'Rejected' },
      ],
    },
  ];

  const handleQualify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interestedCourseId) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/v1/crm/inquiries/${qualifyingInquiry.id}/qualify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interestedCourseId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.messageEnglish || 'Failed to qualify inquiry.');
      } else {
        toast.success('Inquiry successfully qualified and promoted to lead!');
        setQualifyingInquiry(null);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during qualification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[color:var(--ims-ink)]">Inquiries</h1>
          <p className="text-sm text-[color:var(--ims-muted)]">
            Review incoming web inquiries, social media forms, and qualify them to leads.
          </p>
        </div>
      </div>

      <DataTableFilter searchPlaceholder="Search inquiries by name or phone..." filters={filterConfigs} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Inquiry Number</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inquiries.map((inq) => (
            <TableRow key={inq.id}>
              <TableCell className="font-semibold text-xs tracking-wider">{inq.inquiryNumber}</TableCell>
              <TableCell>
                {inq.firstName} {inq.lastName}
              </TableCell>
              <TableCell>{inq.mobile}</TableCell>
              <TableCell>{inq.email || <span className="text-xs text-[color:var(--ims-muted)] italic">N/A</span>}</TableCell>
              <TableCell>{inq.branch?.branchName}</TableCell>
              <TableCell>
                <Badge variant={inq.status === 'Qualified' ? 'success' : inq.status === 'New' ? 'default' : 'error'}>
                  {inq.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {inq.status === 'New' ? (
                  <Button size="sm" onClick={() => setQualifyingInquiry(inq)}>
                    Qualify to Lead
                  </Button>
                ) : (
                  <span className="text-xs text-[color:var(--ims-muted)] italic">Processed</span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {inquiries.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-[color:var(--ims-muted)]">
                No inquiries found in this filter context.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && <Pagination page={currentPage} totalPages={totalPages} totalCount={total} limit={10} />}

      {/* Qualify Inquiry Modal */}
      <Dialog open={!!qualifyingInquiry} onOpenChange={(open) => !open && setQualifyingInquiry(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Qualify Inquiry</DialogTitle>
            <DialogDescription>
              Assign the course that this contact is interested in to promote them to the active leads pipeline.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQualify} className="space-y-4 py-2">
            <FormField>
              <FormLabel required>Interested Course ID (UUID)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter Course UUID (e.g. 123e4567-e89b-12d3-a456-426614174000)"
                  value={interestedCourseId}
                  onChange={(e) => setInterestedCourseId(e.target.value)}
                  required
                />
              </FormControl>
            </FormField>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setQualifyingInquiry(null)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !interestedCourseId.trim()}>
                {isSubmitting ? 'Qualifying...' : 'Promote to Lead'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
