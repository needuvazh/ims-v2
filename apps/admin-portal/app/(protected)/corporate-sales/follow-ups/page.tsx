import { Suspense } from 'react';
import { assertAnyPermission } from '../../../lib/auth-guard';
import { CorporateFollowUpsClient } from './_components/corporate-follow-ups-client';
import { AdminListPageLayout } from '@ims/shared-ui';
import { prisma } from '@ims/database';

export const metadata = { title: 'Corporate Follow-ups - Corporate Sales | ASTI IMS' };
export const dynamic = 'force-dynamic';

export default async function CorporateFollowUpsPage() {
  const session = await assertAnyPermission(['lead.read', 'organization.manage']);

  // Query active sales users for executive assignment display mapping
  const rawUsers = await prisma.user.findMany({
    where: { status: 'Active' },
    include: { person: true },
  });
  const users = rawUsers.map((u) => ({
    id: u.id,
    name: `${u.person.firstName} ${u.person.lastName} (${u.username})`,
  }));

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading corporate follow-ups...</div>}>
        <CorporateFollowUpsClient actorId={session.userId} users={users} />
      </Suspense>
    </AdminListPageLayout>
  );
}
