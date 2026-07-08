import { assertPermission } from '@/lib/auth-guard';
import { Card, PageHeader } from '@ims/shared-ui';

export const metadata = { title: 'Student Portal Profile | ASTI IMS' };

export default async function StudentPortalProfilePage() {
  const session = await assertPermission('student.portal.self.read');
  const { prisma } = await import('@/lib/runtime');

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { personId: true },
  });

  const profile = user
    ? await prisma.studentProfile.findFirst({
        where: { personId: user.personId, isDeleted: false },
        include: {
          person: true,
          branch: true,
          idCardHistory: {
            where: { isDeleted: false },
            orderBy: { eventDate: 'desc' },
          },
        },
      })
    : null;

  if (!profile) {
    return (
      <div className="p-6">
        <PageHeader
          title="Student Portal Profile"
          description="No student profile was linked to this account."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        eyebrow="Student Portal"
        title="My Profile"
        description="Read-only profile and ID card details."
      />

      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Student Number
            </span>
            <input
              className="w-full h-10 rounded-lg border border-slate-200 px-3 bg-slate-50"
              value={profile.studentNumber}
              disabled
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Branch
            </span>
            <input
              className="w-full h-10 rounded-lg border border-slate-200 px-3 bg-slate-50"
              value={profile.branch.branchName}
              disabled
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase text-slate-500">
              First Name
            </span>
            <input
              className="w-full h-10 rounded-lg border border-slate-200 px-3 bg-slate-50"
              value={profile.person.firstName}
              disabled
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Last Name
            </span>
            <input
              className="w-full h-10 rounded-lg border border-slate-200 px-3 bg-slate-50"
              value={profile.person.lastName}
              disabled
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Mobile
            </span>
            <input
              className="w-full h-10 rounded-lg border border-slate-200 px-3 bg-slate-50"
              value={profile.person.mobile}
              disabled
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Email
            </span>
            <input
              className="w-full h-10 rounded-lg border border-slate-200 px-3 bg-slate-50"
              value={profile.person.email ?? ''}
              disabled
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Profile Status
            </span>
            <input
              className="w-full h-10 rounded-lg border border-slate-200 px-3 bg-slate-50"
              value={profile.status}
              disabled
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase text-slate-500">
              ID Card Number
            </span>
            <input
              className="w-full h-10 rounded-lg border border-slate-200 px-3 bg-slate-50"
              value={profile.idCardNumber ?? ''}
              disabled
            />
          </label>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-500">
            ID Card History
          </p>
          <div className="space-y-2">
            {profile.idCardHistory.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <div className="font-semibold">{entry.eventType}</div>
                <div className="text-xs text-slate-500">
                  {entry.newIdCardNumber ?? 'N/A'} | {entry.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
