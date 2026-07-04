import { Card, CardContent, CardDescription, CardHeader, CardTitle, LinkButton, PageHeader } from '@ims/shared-ui';
import { ClipboardList, Layers, BarChart3 } from 'lucide-react';

export default function AttendanceDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Attendance"
        title="Attendance Management"
        description="Branch-scoped attendance operations, correction review, and attendance evidence for enrollment-linked learning sessions."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Session lifecycle', 'Open, mark, submit, lock, and reopen attendance sessions with audit logging.'],
          ['Enrollment-linked records', 'Every attendance record is tied to a valid enrollment and student profile.'],
          ['Correction workflow', 'Approvals and rejections preserve the original attendance history.'],
          ['Branch safety', 'All screens and APIs must be filtered by authorized branch scope.'],
        ].map(([title, description]) => (
          <Card key={title as string}>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Operational Views</CardTitle>
            <CardDescription>Attendance sessions, records, corrections, and reports are available from here.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm text-[color:var(--ims-muted)]">
            <LinkButton href="/attendance/sessions" variant="outline" className="justify-start gap-2">
              <ClipboardList className="h-4 w-4" />
              Sessions
            </LinkButton>
            <LinkButton href="/attendance/records" variant="outline" className="justify-start gap-2">
              <Layers className="h-4 w-4" />
              Records
            </LinkButton>
            <LinkButton href="/attendance/corrections" variant="outline" className="justify-start gap-2">
              <ClipboardList className="h-4 w-4" />
              Corrections
            </LinkButton>
            <LinkButton href="/attendance/reports" variant="outline" className="justify-start gap-2">
              <BarChart3 className="h-4 w-4" />
              Reports
            </LinkButton>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scope Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[color:var(--ims-muted)]">
            <p>Manual attendance is the current scope. Biometric sync remains outside Phase 1.</p>
            <p>Completion and certificate decisions remain in their own bounded contexts.</p>
            <p>Consolidated reporting requires explicit permission and branch scope validation.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
