import { Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from '@ims/shared-ui';

export default function StudentAttendancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student Portal"
        title="My Attendance"
        description="Read-only view of attendance percentage, session history, and low-attendance warnings for your own enrollments."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Percentage</CardTitle>
            <CardDescription>Shows official percentage from submitted or locked sessions only.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-[color:var(--ims-ink)]">--</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Low Attendance Warning</CardTitle>
            <CardDescription>Displays when the attendance threshold is approaching.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-[color:var(--ims-muted)]">No active warning.</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Visibility Rules</CardTitle>
            <CardDescription>Branch-scoped access and only your own enrollment records are visible.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-[color:var(--ims-muted)]">English and Arabic labels should render in the active UI language.</CardContent>
        </Card>
      </div>
    </div>
  );
}
