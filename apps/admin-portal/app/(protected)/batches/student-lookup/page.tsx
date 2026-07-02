import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '@ims/database';
import { Card, PageHeader, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Input, Button } from '@ims/shared-ui';
import { Search, Home, Users } from 'lucide-react';

export const metadata = { title: 'Student Lookup - Admin Portal | ASTI IMS' };

export default async function StudentLookupPage(props: {
  searchParams: Promise<{
    q?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  await assertPermission('student.read');

  const query = searchParams.q || '';
  
  // Search student profiles / leads in the DB
  const studentProfiles = await prisma.studentProfile.findMany({
    where: {
      isDeleted: false,
      OR: [
        { studentNumber: { contains: query, mode: 'insensitive' } },
        { person: { firstName: { contains: query, mode: 'insensitive' } } },
        { person: { lastName: { contains: query, mode: 'insensitive' } } },
        { person: { mobile: { contains: query } } },
      ],
      person: {
        isDeleted: false,
      },
    },
    select: {
      id: true,
      studentNumber: true,
      status: true,
      person: {
        select: {
          firstName: true,
          lastName: true,
          mobile: true,
        },
      },
    },
    take: 20,
  });

  const students = studentProfiles.map((student) => ({
    id: student.id,
    studentNumber: student.studentNumber,
    firstName: student.person.firstName,
    lastName: student.person.lastName,
    phone: student.person.mobile,
    status: student.status,
  }));

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        eyebrow="Admissions"
        title="Student & Candidate Lookup"
        description="Search active students and leads, view their profile summaries, and map queue requests."
      />

      <Card className="p-4 space-y-4">
        {/* Search bar */}
        <form method="GET" className="flex gap-2 max-w-md">
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search by name, student number, or mobile..."
            className="flex-1"
          />
          <Button type="submit">
            <Search className="h-4 w-4 mr-1" /> Search
          </Button>
        </form>

        <h3 className="text-sm font-semibold uppercase flex items-center gap-2 pt-2">
          <Users className="h-4 w-4 text-[color:var(--ims-primary)]" /> Query Results ({students.length})
        </h3>

        {students.length === 0 ? (
          <div className="p-8 text-center text-sm text-[color:var(--ims-muted)]">
            No students found matching the search criteria. Try a different query.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Num</TableHead>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Mobile Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono font-medium">{s.studentNumber}</TableCell>
                  <TableCell>{s.firstName}</TableCell>
                  <TableCell>{s.lastName}</TableCell>
                  <TableCell>{s.phone || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === 'Active' ? 'success' : 'outline'}>{s.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      View Profile
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
