'use client';

import { useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  FilterBar,
  FormError,
  FormField,
  FormLabel,
  Input,
  LinkButton,
  PageHeader,
  Pagination,
  RadioGroup,
  SearchInput,
  Select,
  Skeleton,
  StatCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableLoadingState,
  TableRow,
  Textarea,
  SimpleTooltip,
} from '@ims/shared-ui';
import {
  BookOpen,
  ChevronDown,
  Download,
  GraduationCap,
  MoreHorizontal,
  Plus,
  Settings,
  Users,
} from 'lucide-react';

const SAMPLE_STUDENTS = [
  { id: 'S001', name: 'Fatima Al-Saud', course: 'Process Safety', status: 'active', enrolled: '12 Jan 2025' },
  { id: 'S002', name: 'Ahmed Al-Rashid', course: 'IELTS Preparation', status: 'pending', enrolled: '15 Feb 2025' },
  { id: 'S003', name: 'Nora Al-Qahtani', course: 'Project Management', status: 'completed', enrolled: '03 Mar 2025' },
];

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'default'> = {
  active: 'success',
  pending: 'warning',
  completed: 'default',
};

export default function UIPreviewPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRole, setSelectedRole] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-16 pb-16">
      {/* Page Header */}
      <PageHeader
        title="UI Component Preview"
        description="All base reusable components for the IMS design system. Inspect, test, and verify before use."
        eyebrow="Design System"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Admin', href: '/' },
              { label: 'Settings', href: '/settings' },
              { label: 'UI Preview' },
            ]}
          />
        }
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <LinkButton href="/ui-preview" variant="primary" size="sm">
              <Plus className="h-4 w-4" />
              New Component
            </LinkButton>
          </>
        }
      />

      {/* ─── Stat Cards ─── */}
      <Section title="Stat Cards">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Students" value="12,450" trend={{ value: 8.2, label: 'vs last month' }} icon={<Users className="h-5 w-5" />} />
          <StatCard title="Active Courses" value="38" trend={{ value: 3, label: 'new this month' }} icon={<BookOpen className="h-5 w-5" />} />
          <StatCard title="Certificates Issued" value="2,840" description="This academic year" icon={<GraduationCap className="h-5 w-5" />} />
          <StatCard title="Revenue (OMR)" value="124,000" trend={{ value: -2.1, label: 'vs last month' }} loading={false} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Loading State" value="" loading />
          <StatCard title="No Trend" value="99.8%" description="Uptime this month" icon={<Settings className="h-5 w-5" />} />
        </div>
      </Section>

      {/* ─── Buttons ─── */}
      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Settings"><Settings className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button loading>Saving…</Button>
          <Button disabled>Disabled</Button>
          <LinkButton href="#" variant="primary">Link Button</LinkButton>
          <LinkButton href="#" variant="outline">Outline Link</LinkButton>
        </div>
      </Section>

      {/* ─── Badges ─── */}
      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="success">Active</Badge>
          <Badge variant="warning">Pending</Badge>
          <Badge variant="error">Failed</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="muted">Muted</Badge>
        </div>
      </Section>

      {/* ─── Alerts ─── */}
      <Section title="Alerts">
        <div className="flex flex-col gap-3">
          <Alert variant="info" title="Information" description="Your session will expire in 30 minutes." />
          <Alert variant="success" title="Enrollment Confirmed" description="Student has been successfully enrolled in Process Safety Fundamentals." />
          <Alert variant="warning" title="Fee Overdue" description="Payment for enrollment #E-1042 is overdue by 7 days." dismissible />
          <Alert variant="error" title="Sync Failed" description="Failed to sync attendance records. Please retry." dismissible />
        </div>
      </Section>

      {/* ─── Form Components ─── */}
      <Section title="Form Components">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Input label="Full Name" placeholder="Enter student name" required />
          <Input label="Email" type="email" placeholder="name@example.com" helperText="We'll send enrollment confirmation here." />
          <Input label="Error State" placeholder="Enter ID" errorText="Student ID is required." />
          <Input label="With Icons" placeholder="Search students…" leftIcon={<Users className="h-4 w-4" />} />
          <Textarea label="Notes" placeholder="Add internal notes…" helperText="Max 500 characters." />
          <Textarea label="Error Textarea" placeholder="Add notes…" errorText="Notes cannot be empty." />
          <Select
            label="Course"
            placeholder="Select a course"
            options={[
              { value: 'ps', label: 'Process Safety' },
              { value: 'ielts', label: 'IELTS Preparation' },
              { value: 'pm', label: 'Project Management' },
            ]}
          />
          <Select
            label="Status (Error)"
            placeholder="Choose status"
            options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
            errorText="Please select a status."
          />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Checkbox label="I agree to terms & conditions" description="You must accept before enrolling." />
            <Checkbox label="Send confirmation email" defaultChecked />
            <Checkbox label="Disabled option" disabled />
          </div>
          <RadioGroup
            name="portal"
            label="Portal Access Level"
            value={selectedRole}
            onChange={setSelectedRole}
            options={[
              { value: 'admin', label: 'Admin', description: 'Full system access.' },
              { value: 'trainer', label: 'Trainer', description: 'Access to assigned batches.' },
              { value: 'student', label: 'Student', description: 'Read-only portal access.' },
            ]}
          />
        </div>
        <div className="max-w-sm">
          <FormField>
            <FormLabel htmlFor="custom-field" required>Custom Field</FormLabel>
            <Input id="custom-field" placeholder="Used with FormField wrapper" />
            <FormError>This is a form-level error message.</FormError>
          </FormField>
        </div>
      </Section>

      {/* ─── Cards ─── */}
      <Section title="Cards">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Enrollment Summary</CardTitle>
              <CardDescription>Current academic period performance.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[color:var(--ims-muted)]">450 active enrollments across 12 active batches.</p>
            </CardContent>
            <CardFooter className="justify-between">
              <Badge variant="success">On Track</Badge>
              <Button variant="ghost" size="sm">View All</Button>
            </CardFooter>
          </Card>
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Dashed Border Card</CardTitle>
              <CardDescription>Used for empty or placeholder sections.</CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar fallback="Fatima Al-Saud" size="lg" />
                <div>
                  <p className="font-semibold text-[color:var(--ims-ink)]">Fatima Al-Saud</p>
                  <p className="text-sm text-[color:var(--ims-muted)]">Student · ID S-0042</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* ─── Avatar ─── */}
      <Section title="Avatars">
        <div className="flex flex-wrap items-end gap-4">
          <Avatar fallback="Fatima Al-Saud" size="xs" />
          <Avatar fallback="Ahmed R" size="sm" />
          <Avatar fallback="Nora Q" size="md" />
          <Avatar fallback="IMS Admin" size="lg" />
          <Avatar fallback="System" size="xl" />
          <Avatar src="https://i.pravatar.cc/80?u=ims" alt="Demo User" size="md" />
        </div>
      </Section>

      {/* ─── Search & Filter ─── */}
      <Section title="Search Input & Filter Bar">
        <FilterBar>
          <SearchInput
            placeholder="Search students…"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            className="w-64"
          />
          <Select
            placeholder="Filter by status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'pending', label: 'Pending' },
              { value: 'completed', label: 'Completed' },
            ]}
            className="w-40"
          />
          <Button variant="secondary" size="md">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </FilterBar>
      </Section>

      {/* ─── Table ─── */}
      <Section title="Table">
        <Tabs defaultValue="data">
          <TabsList>
            <TabsTrigger value="data">With Data</TabsTrigger>
            <TabsTrigger value="loading">Loading</TabsTrigger>
            <TabsTrigger value="empty">Empty</TabsTrigger>
          </TabsList>
          <TabsContent value="data">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SAMPLE_STUDENTS.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs text-[color:var(--ims-muted)]">{s.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar fallback={s.name} size="sm" />
                        <span className="font-medium">{s.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{s.course}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[s.status] ?? 'default'}>{s.status}</Badge>
                    </TableCell>
                    <TableCell className="text-[color:var(--ims-muted)]">{s.enrolled}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Row actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>View Profile</DropdownMenuItem>
                          <DropdownMenuItem>Edit Enrollment</DropdownMenuItem>
                          <DropdownMenuItem className="text-[color:var(--ims-error)]">
                            Cancel Enrollment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="loading">
            <Table>
              <TableHeader>
                <TableRow>
                  {['ID', 'Name', 'Course', 'Status', 'Date'].map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableLoadingState columns={5} rows={4} />
            </Table>
          </TabsContent>
          <TabsContent value="empty">
            <Table>
              <TableHeader>
                <TableRow>
                  {['ID', 'Name', 'Course', 'Status', 'Date'].map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableEmptyState colSpan={5} message="No students match your search criteria." />
            </Table>
          </TabsContent>
        </Tabs>
      </Section>

      {/* ─── Pagination ─── */}
      <Section title="Pagination">
        <Pagination
          page={currentPage}
          totalPages={12}
          totalCount={238}
          buildHref={(p: number) => `?page=${p}`}
        />
      </Section>

      {/* ─── Skeletons ─── */}
      <Section title="Skeletons">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[color:var(--ims-muted)]">Card Skeleton</p>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
            <Skeleton className="mt-2 h-4 w-4/6" />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[color:var(--ims-muted)]">Form Skeleton</p>
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-11 w-full rounded-2xl" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[color:var(--ims-muted)]">Stat Skeleton</p>
            <StatCard title="" value="" loading />
          </div>
        </div>
      </Section>

      {/* ─── Empty State ─── */}
      <Section title="Empty State">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No students enrolled"
            description="Add your first student to get started with enrollment management."
            action={<Button><Plus className="h-4 w-4" /> Add Student</Button>}
          />
          <EmptyState
            icon={<BookOpen className="h-6 w-6" />}
            title="No courses available"
            description="Create a course to begin accepting enrollments."
          />
        </div>
      </Section>

      {/* ─── Dialog ─── */}
      <Section title="Dialog / Modal">
        <div className="flex gap-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Enrollment</DialogTitle>
                <DialogDescription>
                  You are about to enroll Fatima Al-Saud in Process Safety Fundamentals (Batch B-24).
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <Input label="Enrollment Note" placeholder="Optional note for admin records…" />
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => setDialogOpen(false)}>Confirm Enrollment</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Section>

      {/* ─── Dropdown ─── */}
      <Section title="Dropdown Menu">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">
              Options <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Student Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View Profile</DropdownMenuItem>
            <DropdownMenuItem>Edit Enrollment</DropdownMenuItem>
            <DropdownMenuItem>Generate Certificate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem data-disabled className="text-[color:var(--ims-error)]">
              Delete Record
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Section>

      {/* ─── Tooltip ─── */}
      <Section title="Tooltips">
        <div className="flex gap-4">
          <SimpleTooltip content="View student profile" side="top">
            <Button variant="outline" size="sm">Hover me (top)</Button>
          </SimpleTooltip>
          <SimpleTooltip content="Download report as PDF" side="right">
            <Button variant="secondary" size="sm">Hover me (right)</Button>
          </SimpleTooltip>
          <SimpleTooltip content="This action is irreversible" side="bottom">
            <Button variant="destructive" size="sm">Hover me (bottom)</Button>
          </SimpleTooltip>
        </div>
      </Section>

      {/* ─── Breadcrumbs ─── */}
      <Section title="Breadcrumbs">
        <div className="flex flex-col gap-4">
          <Breadcrumbs items={[{ label: 'Admin', href: '/' }, { label: 'Students', href: '/students' }, { label: 'Fatima Al-Saud' }]} />
          <Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Enrollments' }]} />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--ims-muted)]">
          {title}
        </h2>
        <div className="h-px flex-1 bg-[color:var(--ims-border)]" />
      </div>
      {children}
    </section>
  );
}
