import { notFound } from 'next/navigation';
import { Badge, AdminDetailPageLayout, Breadcrumbs, PageHeader, LinkButton } from '@ims/shared-ui';
import { getFacultyTrainerContext } from '../../_lib';
import {
  Home,
  Users,
  User,
  Mail,
  Phone,
  MapPin,
  BookOpen,
  Clock,
  Award,
  DollarSign,
  Layers,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import { prisma } from '@ims/database';
import {
  TrainerQualificationDrawerAction,
  TrainerQualificationEditDrawerAction,
  TrainerAvailabilityDrawerAction,
  TrainerAvailabilityEditDrawerAction,
  TrainerAuthorizationDrawerAction,
  TrainerAuthorizationEditDrawerAction,
  TrainerProfileEditDrawerAction,
} from './_components/trainer-child-record-drawers';

export const metadata = { title: 'Trainer Detail | IMS Admin' };
export const dynamic = 'force-dynamic';

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default async function TrainerDetailPage(props: { params: Promise<{ trainerId: string }> }) {
  const { trainerId } = await props.params;
  const { authContext } = await getFacultyTrainerContext();
  const { trainerManagementService, organizationService } = await import('../../../../lib/runtime');

  const trainer = await trainerManagementService.getTrainer(trainerId, authContext).catch(() => null);
  if (!trainer) notFound();

  const [qualifications, availability, authorizations, compensation, assignments, audit, branchResult, courses] = await Promise.all([
    trainerManagementService.listQualifications(trainerId, { page: 1, pageSize: 20 }, authContext),
    trainerManagementService.listAvailability(trainerId, { page: 1, pageSize: 20 }, authContext),
    trainerManagementService.listAuthorizations(trainerId, { page: 1, pageSize: 20 }, authContext),
    trainerManagementService.listCompensationRates(trainerId, { page: 1, pageSize: 20 }, authContext),
    trainerManagementService.listAssignmentReferences(trainerId, { page: 1, pageSize: 20, kind: 'All' }, authContext),
    trainerManagementService.listAuditHistory(trainerId, { page: 1, pageSize: 20 }, authContext),
    organizationService.listBranches({ pageSize: 1000, status: 'Active' }),
    prisma.course.findMany({
      where: { isDeleted: false, status: { not: 'Archived' } },
      select: { id: true, courseCode: true, nameEnglish: true, status: true },
      orderBy: [{ courseCode: 'asc' }],
    }),
  ]);
  const allowedBranchIds = new Set((authContext.allowedBranchIds ?? []).map(String));
  const canEditTrainer = authContext.permissions.includes('trainer.update');
  const branchOptions = branchResult.items
    .filter((branch) => allowedBranchIds.size === 0 || allowedBranchIds.has(String(branch.id)))
    .map((branch) => ({
      id: String(branch.id),
      branchName: branch.branchName,
      branchCode: branch.branchCode,
    }));
  const courseOptions = courses.map((course) => ({
    id: course.id,
    courseCode: course.courseCode,
    nameEnglish: course.nameEnglish,
    status: course.status,
  }));

  const fullName = trainer.person?.firstName && trainer.person?.lastName
    ? `${trainer.person.firstName} ${trainer.person.lastName}`
    : trainer.trainerCode;

  return (
    <AdminDetailPageLayout>
      <PageHeader
        title={fullName}
        description={`${trainer.trainerType} trainer · ${trainer.specialization}`}
        backUrl="/faculty/trainers"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5" /> },
              { label: 'Faculty', href: '/faculty/trainers', icon: <Users className="h-3.5 w-3.5" /> },
              { label: 'Trainers', href: '/faculty/trainers' },
              { label: fullName, icon: <User className="h-3.5 w-3.5" /> },
            ]}
          />
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/faculty/trainers" variant="secondary" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </LinkButton>
            {canEditTrainer ? (
              <TrainerProfileEditDrawerAction
                trainer={{
                  id: trainer.id,
                  branchId: trainer.branchId,
                  trainerCode: trainer.trainerCode,
                  trainerType: trainer.trainerType,
                  specialization: trainer.specialization,
                  qualificationSummary: trainer.qualificationSummary ?? null,
                  status: trainer.status,
                  effectiveStartDate: trainer.effectiveStartDate,
                  effectiveEndDate: trainer.effectiveEndDate,
                  version: trainer.version,
                }}
                trainerName={fullName}
                branchOptions={branchOptions}
              />
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant={trainer.status === 'Active' ? 'success' : trainer.status === 'Suspended' ? 'warning' : 'muted'}>
          {trainer.status}
        </Badge>
        <Badge variant="outline" className="font-mono">{trainer.trainerCode}</Badge>
        <Badge variant="outline">{trainer.branch?.branchName ?? trainer.branchId}</Badge>
      </div>

      {/* Summary Card */}
      <div className="rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-5 shadow-sm backdrop-blur-md sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-600">
              {trainer.person?.firstName && trainer.person?.lastName
                ? `${trainer.person.firstName[0]}${trainer.person.lastName[0]}`.toUpperCase()
                : 'TR'}
            </div>
            <div className="space-y-2">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">{fullName}</h2>
                <p className="text-sm text-slate-500">{trainer.trainerType} Trainer</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {trainer.person?.email && (
                  <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    <Mail className="h-3 w-3" />
                    {trainer.person.email}
                  </span>
                )}
                {trainer.person?.mobile && (
                  <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    <Phone className="h-3 w-3" />
                    {trainer.person.mobile}
                  </span>
                )}
                {trainer.branch && (
                  <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    <MapPin className="h-3 w-3" />
                    {trainer.branch.branchName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Trainer Code</p>
              <p className="mt-1 text-sm font-mono font-semibold text-slate-800">{trainer.trainerCode}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Start Date</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{formatDate(trainer.effectiveStartDate)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">End Date</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{trainer.effectiveEndDate ? formatDate(trainer.effectiveEndDate) : 'Indefinite'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Specialization</p>
              <p className="mt-1 text-sm font-semibold text-slate-800 truncate max-w-32" title={trainer.specialization}>
                {trainer.specialization.length > 20 ? `${trainer.specialization.slice(0, 20)}...` : trainer.specialization}
              </p>
            </div>
          </div>
        </div>

        {trainer.qualificationSummary && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Qualification Summary</p>
            <p className="text-sm text-slate-700">{trainer.qualificationSummary}</p>
          </div>
        )}
      </div>

      {/* Detail Cards Grid */}
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* Qualifications */}
        <div className="rounded-2xl border border-[color:var(--ims-border)] bg-white/80 shadow-sm backdrop-blur-md">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Qualifications</h3>
                <p className="text-xs text-slate-500">Education and credential evidence</p>
              </div>
            </div>
            <TrainerQualificationDrawerAction trainerId={trainerId} trainerName={fullName} />
          </div>
          <div className="p-5">
            {qualifications.items.length > 0 ? (
              <div className="space-y-3">
                {qualifications.items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-800 text-sm">{item.qualificationName}</p>
                        <p className="text-xs text-slate-500">{item.institution} · {item.yearCompleted}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        {item.status && (
                          <Badge variant={item.status === 'Active' ? 'success' : 'muted'} className="text-xs">{item.status}</Badge>
                        )}
                        <TrainerQualificationEditDrawerAction trainerId={trainerId} trainerName={fullName} qualification={item} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Award className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-500">No qualifications recorded</p>
                <p className="text-xs text-slate-400 mt-1">Add education and credential details</p>
              </div>
            )}
          </div>
        </div>

        {/* Availability */}
        <div className="rounded-2xl border border-[color:var(--ims-border)] bg-white/80 shadow-sm backdrop-blur-md">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Availability</h3>
                <p className="text-xs text-slate-500">Trusted availability windows used by scheduling</p>
              </div>
            </div>
            <TrainerAvailabilityDrawerAction
              trainerId={trainerId}
              trainerName={fullName}
              branchOptions={branchOptions}
              defaultBranchId={String(trainer.branchId)}
            />
          </div>
          <div className="p-5">
            {availability.items.length > 0 ? (
              <div className="space-y-2">
                {availability.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-xs font-semibold text-indigo-600">
                        {item.dayOfWeek.slice(0, 3)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{item.dayOfWeek}</p>
                        <p className="text-xs text-slate-500">{item.startTime} - {item.endTime}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status && (
                        <Badge variant={item.status === 'Active' ? 'success' : 'muted'} className="text-xs">{item.status}</Badge>
                      )}
                      <TrainerAvailabilityEditDrawerAction
                        trainerId={trainerId}
                        trainerName={fullName}
                        branchOptions={branchOptions}
                        availability={item}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-500">No availability set</p>
                <p className="text-xs text-slate-400 mt-1">Define weekly availability windows</p>
              </div>
            )}
          </div>
        </div>

        {/* Authorizations */}
        <div className="rounded-2xl border border-[color:var(--ims-border)] bg-white/80 shadow-sm backdrop-blur-md">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Course Authorizations</h3>
                <p className="text-xs text-slate-500">Approved course coverage for this trainer</p>
              </div>
            </div>
            <TrainerAuthorizationDrawerAction trainerId={trainerId} trainerName={fullName} courseOptions={courseOptions} />
          </div>
          <div className="p-5">
            {authorizations.items.length > 0 ? (
              <div className="space-y-2">
                {authorizations.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {item.course?.courseCode ?? item.courseId}
                      </p>
                      {item.course?.nameEnglish && (
                        <p className="text-xs text-slate-500">{item.course.nameEnglish}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.status === 'Active' ? 'success' : item.status === 'Expired' ? 'warning' : 'muted'} className="text-xs">
                        {item.status}
                      </Badge>
                      <TrainerAuthorizationEditDrawerAction trainerId={trainerId} trainerName={fullName} authorization={item} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BookOpen className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-500">No course authorizations</p>
                <p className="text-xs text-slate-400 mt-1">Authorize courses this trainer can teach</p>
              </div>
            )}
          </div>
        </div>

        {/* Compensation */}
        <div className="rounded-2xl border border-[color:var(--ims-border)] bg-white/80 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Compensation Rates</h3>
              <p className="text-xs text-slate-500">Resolved compensation rates and payment basis</p>
            </div>
          </div>
          <div className="p-5">
            {compensation.items.length > 0 ? (
              <div className="space-y-2">
                {compensation.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {item.amount} {item.currency}
                      </p>
                      <p className="text-xs text-slate-500">{item.paymentBasis}</p>
                    </div>
                    {item.status && (
                      <Badge variant={item.status === 'Active' ? 'success' : 'muted'} className="text-xs">{item.status}</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <DollarSign className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-500">No compensation configured</p>
                <p className="text-xs text-slate-400 mt-1">Set up payment rates for this trainer</p>
              </div>
            )}
          </div>
        </div>

        {/* Assignments */}
        <div className="rounded-2xl border border-[color:var(--ims-border)] bg-white/80 shadow-sm backdrop-blur-md lg:col-span-2">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Assignments</h3>
              <p className="text-xs text-slate-500">Batch and session references linked to this trainer</p>
            </div>
          </div>
          <div className="p-5">
            {assignments.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                      <th className="pb-3 pr-4">Type</th>
                      <th className="pb-3 pr-4">Code</th>
                      <th className="pb-3 pr-4">Course</th>
                      <th className="pb-3 pr-4">Start Date</th>
                      <th className="pb-3 pr-4">End Date</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignments.items.map((item, index) => (
                      <tr key={`${item.kind}-${item.referenceId}-${index}`} className="text-slate-700">
                        <td className="py-3 pr-4">
                          <Badge variant="outline" className="text-xs">{item.kind}</Badge>
                        </td>
                        <td className="py-3 pr-4 font-mono font-medium text-slate-800">{item.code}</td>
                        <td className="py-3 pr-4 text-slate-600">{item.courseCode ?? 'N/A'}</td>
                        <td className="py-3 pr-4 text-slate-600">{formatDate(item.startDate)}</td>
                        <td className="py-3 pr-4 text-slate-600">{formatDate(item.endDate)}</td>
                        <td className="py-3">
                          {item.status ? (
                            <Badge variant={item.status === 'Active' || item.status === 'Open' ? 'success' : 'muted'} className="text-xs">
                              {item.status}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Layers className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-500">No assignments</p>
                <p className="text-xs text-slate-400 mt-1">This trainer is not assigned to any batches or sessions</p>
              </div>
            )}
          </div>
        </div>

        {/* Audit History */}
        <div className="rounded-2xl border border-[color:var(--ims-border)] bg-white/80 shadow-sm backdrop-blur-md lg:col-span-2">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Audit History</h3>
              <p className="text-xs text-slate-500">Immutable activity trail for sensitive trainer changes</p>
            </div>
          </div>
          <div className="p-5">
            {audit.items.length > 0 ? (
              <div className="space-y-3">
                {audit.items.map((item: Record<string, unknown>, index) => (
                  <div key={String(item.id ?? index)} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                        {index + 1}
                      </div>
                      {index < audit.items.length - 1 && (
                        <div className="w-px h-full bg-slate-200 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium text-slate-800">{String(item.action ?? '')}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(item.performedAt as Date | string | null | undefined)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-500">No audit history</p>
                <p className="text-xs text-slate-400 mt-1">Activity will be recorded as changes are made</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminDetailPageLayout>
  );
}
