'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Eye,
  LayoutDashboard,
  MapPinned,
  Sparkles,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ims/shared-ui';
import { ConflictResolutionWizard } from './conflict-resolution-wizard';

type ConflictSessionRow = {
  id: string;
  batchId: string;
  batchCode: string;
  batchNameEnglish: string;
  courseName: string;
  titleEnglish: string;
  titleArabic: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  branchId: string;
  branchName: string;
  classroomId: string | null;
  classroomName: string | null;
  scheduleStatus: string;
  conflictType: string | null;
  overrideReason: string | null;
  isConflictIgnored: boolean;
};

type ClassroomOption = {
  id: string;
  classroomName: string;
  branchId: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function conflictLabel(conflictType: string | null) {
  switch (conflictType) {
    case 'HOLIDAY':
      return 'Holiday';
    case 'VENUE':
      return 'Venue';
    case 'TRAINER_OVERLAP':
      return 'Trainer overlap';
    case 'CLASSROOM_OVERLAP':
      return 'Classroom overlap';
    case 'OPERATING_HOURS':
      return 'Operating hours';
    default:
      return 'Conflict';
  }
}

function rowTone(session: ConflictSessionRow) {
  if (session.scheduleStatus === 'Conflict') return 'bg-rose-50/70';
  if (session.isConflictIgnored || session.overrideReason)
    return 'bg-amber-50/70';
  return 'border-[color:var(--ims-border)] bg-white';
}

export function ConflictDashboardClient({
  sessions,
  classrooms,
}: {
  sessions: ConflictSessionRow[];
  classrooms: ClassroomOption[];
}) {
  const router = useRouter();
  const [selectedSession, setSelectedSession] =
    useState<ConflictSessionRow | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const counts = useMemo(() => {
    const conflict = sessions.filter(
      (session) => session.scheduleStatus === 'Conflict',
    ).length;
    const warning = sessions.filter(
      (session) => session.isConflictIgnored || session.overrideReason,
    ).length;
    const holiday = sessions.filter(
      (session) => session.conflictType === 'HOLIDAY',
    ).length;
    const venue = sessions.filter(
      (session) => session.conflictType === 'VENUE',
    ).length;
    const overlap = sessions.filter(
      (session) =>
        session.conflictType === 'TRAINER_OVERLAP' ||
        session.conflictType === 'CLASSROOM_OVERLAP',
    ).length;

    return { conflict, warning, holiday, venue, overlap };
  }, [sessions]);

  const openWizard = (session: ConflictSessionRow) => {
    setSelectedSession(session);
    setWizardOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="border-[color:var(--ims-border)] shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-widest">
              Conflicts
            </CardDescription>
            <CardTitle className="text-2xl">{counts.conflict}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-[color:var(--ims-border)] shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-widest">
              Warnings
            </CardDescription>
            <CardTitle className="text-2xl">{counts.warning}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-[color:var(--ims-border)] shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-widest">
              Holiday
            </CardDescription>
            <CardTitle className="text-2xl">{counts.holiday}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-[color:var(--ims-border)] shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-widest">
              Venue
            </CardDescription>
            <CardTitle className="text-2xl">{counts.venue}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-[color:var(--ims-border)] shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-widest">
              Overlap
            </CardDescription>
            <CardTitle className="text-2xl">{counts.overlap}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-[color:var(--ims-border)]">
        <CardHeader className="border-b border-[color:var(--ims-border)] bg-[color:var(--ims-surface-hover)]">
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutDashboard className="h-4 w-4 text-[color:var(--ims-brass)]" />
            Conflict dashboard
          </CardTitle>
          <CardDescription>
            Review invalid or at-risk sessions, then reschedule, change venue,
            or cancel them from the side panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {sessions.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Sparkles className="h-6 w-6" />}
                title="No schedule conflicts"
                description="Nothing currently needs resolution for the selected filters."
              />
            </div>
          ) : (
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Timing</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id} className={rowTone(session)}>
                      <TableCell>
                        <div className="font-medium text-[color:var(--ims-ink)]">
                          {session.titleEnglish}
                        </div>
                        <div
                          className="text-xs font-arabic text-[color:var(--ims-muted)]"
                          dir="rtl"
                        >
                          {session.titleArabic}
                        </div>
                        <div className="mt-1 text-xs text-[color:var(--ims-muted)]">
                          {session.batchCode} · {session.courseName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-[color:var(--ims-muted)]">
                          <CalendarDays className="h-4 w-4" />
                          {formatDate(session.sessionDate)}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-[color:var(--ims-muted)]">
                          <Clock3 className="h-4 w-4" />
                          {session.startTime} - {session.endTime}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-[color:var(--ims-ink)]">
                          {session.branchName}
                        </div>
                        <div className="text-xs text-[color:var(--ims-muted)]">
                          {session.classroomName ?? 'Branch-wide block'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant={
                              session.scheduleStatus === 'Conflict'
                                ? 'error'
                                : 'success'
                            }
                          >
                            {session.scheduleStatus}
                          </Badge>
                          {session.isConflictIgnored && (
                            <Badge variant="success">Override</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline">
                            {conflictLabel(session.conflictType)}
                          </Badge>
                          {session.overrideReason && (
                            <p
                              className="max-w-[18rem] truncate text-xs text-[color:var(--ims-muted)]"
                              title={session.overrideReason}
                            >
                              {session.overrideReason}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => openWizard(session)}
                          >
                            Resolve
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                          <Link
                            href={`/batches/${session.batchId}`}
                            className="inline-flex"
                          >
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface-hover)] p-4 text-sm text-[color:var(--ims-muted)]">
        <div className="flex flex-wrap items-center gap-2 font-semibold text-[color:var(--ims-ink)]">
          <MapPinned className="h-4 w-4 text-[color:var(--ims-brass)]" />
          Resolution workflow
        </div>
        <p className="mt-2 max-w-3xl leading-relaxed">
          Use the side panel to reschedule the session, move it to another
          classroom, or cancel it while keeping the audit trail intact.
        </p>
      </div>

      <ConflictResolutionWizard
        session={selectedSession}
        open={wizardOpen}
        classrooms={classrooms}
        onOpenChange={setWizardOpen}
        onResolved={() => router.refresh()}
      />
    </div>
  );
}
