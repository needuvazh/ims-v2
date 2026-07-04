import { Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from '@ims/shared-ui';

const steps = [
  'Open a scheduled session from your assigned branch.',
  'Generate the roster from active enrollments.',
  'Mark Present, Absent, Late, or Excused.',
  'Submit the session when every required record is resolved.',
];

export default function TrainerAttendancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Trainer Portal"
        title="Attendance Workflow"
        description="Trainer-facing attendance entry for assigned sessions. Locked sessions must use the correction workflow."
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Daily Workflow</CardTitle>
            <CardDescription>Use this page as the operational entry point for manual attendance in Phase 1.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {steps.map((step, index) => (
              <div key={step} className="flex gap-3 rounded-xl border border-[color:var(--ims-border)] p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--ims-accent-soft)] text-sm font-semibold text-[color:var(--ims-accent)]">
                  {index + 1}
                </span>
                <p className="text-sm text-[color:var(--ims-ink)]">{step}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rules</CardTitle>
            <CardDescription>All access is checked on the server.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[color:var(--ims-muted)]">
            <p>Attendance must be scoped to the trainer’s authorized branch.</p>
            <p>Biometric device sync is not part of the current scope.</p>
            <p>Attendance evidence is shared with completion review, but completion remains external to Attendance.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
