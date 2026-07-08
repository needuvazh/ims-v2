import {
  AdminListPageLayout,
  Breadcrumbs,
  PageHeader,
  LinkButton,
  Badge,
  Input,
  Select,
  FormField,
  FormLabel,
  FormControl,
  Pagination,
} from '@ims/shared-ui';
import { getFacultyTrainerContext } from '../_lib';
import { prisma } from '@ims/database';
import {
  Home,
  Users,
  Search,
  BookOpen,
  MapPin,
  Clock,
  UserCheck,
  AlertCircle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Filter,
} from 'lucide-react';

export const metadata = { title: 'Eligible Trainer Finder | IMS Admin' };
export const dynamic = 'force-dynamic';

const ELIGIBILITY_REASON_LABELS: Record<string, string> = {
  TRAINER_NOT_FOUND: 'Trainer profile not found',
  PROFILE_INACTIVE: 'Profile is inactive',
  PROFILE_OUTSIDE_EFFECTIVE_PERIOD: 'Outside effective date range',
  COURSE_NOT_AUTHORIZED: 'Not authorized for this course',
  TRAINER_NOT_AVAILABLE: 'Not available at this time',
  BRANCH_SCOPE_DENIED: 'Branch scope denied',
};

export default async function EligibleTrainersPage(props: {
  searchParams: Promise<{
    courseId?: string;
    branchId?: string;
    targetDate?: string;
    startTime?: string;
    endTime?: string;
    q?: string;
    page?: string;
    showOnlyEligible?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const { authContext, session } = await getFacultyTrainerContext();
  const { trainerManagementService, branchScopeResolver } =
    await import('../../../lib/runtime');

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const pageSize = 20;
  const showOnlyEligible = searchParams.showOnlyEligible === 'true';

  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any,
  );

  const [courses, branches] = await Promise.all([
    prisma.course.findMany({
      where: { status: 'Published', isDeleted: false },
      select: { id: true, courseCode: true, nameEnglish: true },
      orderBy: { nameEnglish: 'asc' },
    }),
    prisma.branch.findMany({
      where: {
        isDeleted: false,
        ...(allowedBranchIds.length > 0
          ? { id: { in: allowedBranchIds } }
          : {}),
      },
      select: { id: true, branchName: true, branchCode: true },
      orderBy: { branchName: 'asc' },
    }),
  ]);

  const hasSearch = !!(
    searchParams.courseId &&
    (searchParams.branchId || session.activeBranchId)
  );

  const result = hasSearch
    ? await trainerManagementService.findEligibleTrainers(
        {
          courseId: searchParams.courseId!,
          branchId: searchParams.branchId ?? session.activeBranchId ?? '',
          targetDate: searchParams.targetDate
            ? new Date(searchParams.targetDate)
            : new Date(),
          startTime: searchParams.startTime,
          endTime: searchParams.endTime,
          q: searchParams.q,
        },
        { page, pageSize },
        authContext,
      )
    : { items: [], total: 0 };

  const allItems = result.items;

  const filteredItems = showOnlyEligible
    ? allItems.filter((t) => t.eligible)
    : allItems;
  const eligibleCount = allItems.filter((t) => t.eligible).length;
  const ineligibleCount = allItems.length - eligibleCount;

  const selectedCourse = courses.find((c) => c.id === searchParams.courseId);

  return (
    <AdminListPageLayout>
      <PageHeader
        title="Eligible Trainer Finder"
        description="Validate trainer availability and course authorization for scheduling and training delivery."
        backUrl="/faculty/trainers"
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Dashboard',
                href: '/dashboard',
                icon: <Home className="h-3.5 w-3.5" />,
              },
              {
                label: 'Faculty',
                href: '/faculty/trainers',
                icon: <Users className="h-3.5 w-3.5" />,
              },
              {
                label: 'Eligible Trainers',
                icon: <UserCheck className="h-3.5 w-3.5" />,
              },
            ]}
          />
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/faculty/trainers/new" variant="secondary">
              Register New Trainer
            </LinkButton>
          </div>
        }
      />

      {/* Search Form */}
      <div className="rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-5 shadow-sm backdrop-blur-md sm:p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Search className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Eligibility Search</h3>
            <p className="text-xs text-slate-500">
              Provide course, branch, and session timing to evaluate trainer
              eligibility
            </p>
          </div>
        </div>

        <form method="get" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField>
              <FormLabel required>Course</FormLabel>
              <FormControl>
                <Select
                  name="courseId"
                  placeholder="Select a course"
                  defaultValue={searchParams.courseId ?? ''}
                  options={courses.map((c) => ({
                    value: c.id,
                    label: `${c.nameEnglish} (${c.courseCode})`,
                  }))}
                />
              </FormControl>
            </FormField>

            <FormField>
              <FormLabel required>Branch</FormLabel>
              <FormControl>
                <Select
                  name="branchId"
                  placeholder="Select a branch"
                  defaultValue={
                    searchParams.branchId ?? session.activeBranchId ?? ''
                  }
                  options={branches.map((b) => ({
                    value: b.id,
                    label: `${b.branchName} (${b.branchCode})`,
                  }))}
                />
              </FormControl>
            </FormField>

            <FormField>
              <FormLabel required>Target Date</FormLabel>
              <FormControl>
                <Input
                  name="targetDate"
                  type="date"
                  defaultValue={
                    searchParams.targetDate ??
                    new Date().toISOString().split('T')[0]
                  }
                />
              </FormControl>
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField>
              <FormLabel>Start Time</FormLabel>
              <FormControl>
                <Input
                  name="startTime"
                  type="time"
                  defaultValue={searchParams.startTime ?? ''}
                />
              </FormControl>
            </FormField>

            <FormField>
              <FormLabel>End Time</FormLabel>
              <FormControl>
                <Input
                  name="endTime"
                  type="time"
                  defaultValue={searchParams.endTime ?? ''}
                />
              </FormControl>
            </FormField>

            <FormField>
              <FormLabel>Search Trainer</FormLabel>
              <FormControl>
                <Input
                  name="q"
                  placeholder="Name or code"
                  defaultValue={searchParams.q ?? ''}
                  leftIcon={<Search className="h-4 w-4" />}
                />
              </FormControl>
            </FormField>

            <div className="flex items-end">
              <button
                type="submit"
                className="h-11 w-full rounded-2xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Evaluate Eligibility
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Results */}
      {hasSearch && (
        <>
          {/* Summary Stats */}
          {allItems.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Total
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-800">
                  {allItems.length}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm">
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">
                  Eligible
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">
                  {eligibleCount}
                </p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 shadow-sm">
                <p className="text-xs font-medium text-rose-600 uppercase tracking-wide">
                  Not Eligible
                </p>
                <p className="mt-1 text-2xl font-bold text-rose-700">
                  {ineligibleCount}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Course
                </p>
                <p
                  className="mt-1 text-sm font-semibold text-slate-800 truncate"
                  title={selectedCourse?.nameEnglish}
                >
                  {selectedCourse?.nameEnglish ?? 'N/A'}
                </p>
              </div>
            </div>
          )}

          {/* Filter Toggle */}
          {allItems.length > 0 && (
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-slate-400" />
              <form method="get" className="flex items-center gap-2">
                <input
                  type="hidden"
                  name="courseId"
                  value={searchParams.courseId ?? ''}
                />
                <input
                  type="hidden"
                  name="branchId"
                  value={searchParams.branchId ?? session.activeBranchId ?? ''}
                />
                <input
                  type="hidden"
                  name="targetDate"
                  value={searchParams.targetDate ?? ''}
                />
                <input
                  type="hidden"
                  name="startTime"
                  value={searchParams.startTime ?? ''}
                />
                <input
                  type="hidden"
                  name="endTime"
                  value={searchParams.endTime ?? ''}
                />
                <input type="hidden" name="q" value={searchParams.q ?? ''} />
                <input
                  type="hidden"
                  name="showOnlyEligible"
                  value={showOnlyEligible ? 'false' : 'true'}
                />
                <button
                  type="submit"
                  className={`text-sm font-medium px-3 py-1.5 rounded-lg transition ${
                    showOnlyEligible
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {showOnlyEligible
                    ? 'Showing eligible only'
                    : 'Show all trainers'}
                </button>
              </form>
            </div>
          )}

          {/* Results Table */}
          {filteredItems.length > 0 ? (
            <div className="rounded-2xl border border-[color:var(--ims-border)] bg-white/80 shadow-sm backdrop-blur-md overflow-hidden">
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50/80">
                    <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                      <th className="px-5 py-3">Trainer</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Branch</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Course Auth</th>
                      <th className="px-5 py-3">Availability</th>
                      <th className="px-5 py-3">Eligibility</th>
                      <th className="px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item) => {
                      const hasCourseAuth = !item.reasonCodes?.includes(
                        'COURSE_NOT_AUTHORIZED',
                      );
                      const hasAvailability = !item.reasonCodes?.includes(
                        'TRAINER_NOT_AVAILABLE',
                      );

                      return (
                        <tr
                          key={item.trainerId}
                          className="hover:bg-slate-50/50 transition"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600">
                                {item.displayName.en
                                  .split(' ')
                                  .map((n: string) => n[0])
                                  .slice(0, 2)
                                  .join('')
                                  .toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">
                                  {item.displayName.en}
                                </p>
                                <p className="text-xs text-slate-500 font-mono">
                                  {item.trainerCode}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {item.trainerType ? (
                              <Badge variant="outline" className="text-xs">
                                {item.trainerType}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400">
                                N/A
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {item.branchName ? (
                              <span className="text-xs text-slate-600">
                                {item.branchName}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">
                                N/A
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {item.status ? (
                              <Badge
                                variant={
                                  item.status === 'Active' ? 'success' : 'muted'
                                }
                                className="text-xs"
                              >
                                {item.status}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400">
                                N/A
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {hasCourseAuth ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                <CheckCircle className="h-3.5 w-3.5" />
                                Authorized
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-medium">
                                <XCircle className="h-3.5 w-3.5" />
                                Not authorized
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {hasAvailability ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                <CheckCircle className="h-3.5 w-3.5" />
                                Available
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-medium">
                                <XCircle className="h-3.5 w-3.5" />
                                Not available
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {item.eligible ? (
                              <Badge
                                variant="success"
                                className="text-xs font-semibold"
                              >
                                Eligible
                              </Badge>
                            ) : (
                              <Badge
                                variant="error"
                                className="text-xs font-semibold"
                              >
                                Not Eligible
                              </Badge>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <LinkButton
                              href={`/faculty/trainers/${item.trainerId}`}
                              variant="ghost"
                              className="text-xs"
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1" />
                              View
                            </LinkButton>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const hasCourseAuth = !item.reasonCodes?.includes(
                    'COURSE_NOT_AUTHORIZED',
                  );
                  const hasAvailability = !item.reasonCodes?.includes(
                    'TRAINER_NOT_AVAILABLE',
                  );

                  return (
                    <div key={item.trainerId} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
                            {item.displayName.en
                              .split(' ')
                              .map((n: string) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">
                              {item.displayName.en}
                            </p>
                            <p className="text-xs text-slate-500 font-mono">
                              {item.trainerCode}
                            </p>
                          </div>
                        </div>
                        {item.eligible ? (
                          <Badge
                            variant="success"
                            className="text-xs font-semibold"
                          >
                            Eligible
                          </Badge>
                        ) : (
                          <Badge
                            variant="error"
                            className="text-xs font-semibold"
                          >
                            Not Eligible
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {item.trainerType && (
                          <Badge variant="outline" className="text-xs">
                            {item.trainerType}
                          </Badge>
                        )}
                        {item.status && (
                          <Badge
                            variant={
                              item.status === 'Active' ? 'success' : 'muted'
                            }
                            className="text-xs"
                          >
                            {item.status}
                          </Badge>
                        )}
                        {item.branchName && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {item.branchName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <span
                          className={`inline-flex items-center gap-1 ${hasCourseAuth ? 'text-emerald-600' : 'text-rose-600'}`}
                        >
                          {hasCourseAuth ? (
                            <CheckCircle className="h-3.5 w-3.5" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                          {hasCourseAuth
                            ? 'Course authorized'
                            : 'Not authorized'}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 ${hasAvailability ? 'text-emerald-600' : 'text-rose-600'}`}
                        >
                          {hasAvailability ? (
                            <CheckCircle className="h-3.5 w-3.5" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                          {hasAvailability ? 'Available' : 'Not available'}
                        </span>
                      </div>

                      {!item.eligible &&
                        item.reasonCodes &&
                        item.reasonCodes.length > 0 && (
                          <div className="space-y-1">
                            {item.reasonCodes.map((code) => (
                              <p
                                key={code}
                                className="text-xs text-rose-600 flex items-center gap-1.5"
                              >
                                <AlertCircle className="h-3 w-3 shrink-0" />
                                {ELIGIBILITY_REASON_LABELS[code] ?? code}
                              </p>
                            ))}
                          </div>
                        )}

                      <div className="pt-1">
                        <LinkButton
                          href={`/faculty/trainers/${item.trainerId}`}
                          variant="ghost"
                          className="text-xs"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          View Profile
                        </LinkButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/50 p-12 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-4">
                  <UserCheck className="h-7 w-7 text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-700">
                  {allItems.length === 0
                    ? 'No trainers evaluated yet'
                    : 'No eligible trainers found'}
                </h3>
                <p className="mt-2 text-sm text-slate-500 max-w-md">
                  {allItems.length === 0
                    ? 'Select a course, branch, and date above to evaluate trainer eligibility.'
                    : 'Try adjusting the date, time, or course to find available trainers. You can also register a new trainer.'}
                </p>
                {allItems.length === 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    <LinkButton
                      href="/faculty/trainers/new"
                      variant="secondary"
                    >
                      Register New Trainer
                    </LinkButton>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pagination */}
          {result.total > pageSize && (
            <Pagination
              page={page}
              totalPages={Math.ceil(result.total / pageSize)}
              totalCount={result.total}
              limit={pageSize}
            />
          )}
        </>
      )}

      {/* Initial State */}
      {!hasSearch && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/50 p-12 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 mb-4">
              <Search className="h-7 w-7 text-indigo-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700">
              Find Eligible Trainers
            </h3>
            <p className="mt-2 text-sm text-slate-500 max-w-md">
              Select a course, branch, and session timing to evaluate which
              trainers are eligible for assignment. The system checks course
              authorization, availability, and branch scope.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full text-left">
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <BookOpen className="h-5 w-5 text-indigo-500 mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  Course Authorization
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Verifies trainer is authorized to teach the selected course
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <Clock className="h-5 w-5 text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  Availability Check
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Confirms trainer is available during the specified time slot
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <MapPin className="h-5 w-5 text-amber-500 mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  Branch Scope
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Validates trainer is assigned to the selected branch
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminListPageLayout>
  );
}
