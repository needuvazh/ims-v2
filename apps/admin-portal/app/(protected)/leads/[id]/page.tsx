import { notFound } from 'next/navigation';
import { assertPermission } from '@/lib/auth-guard';
import { LeadDetailsClient } from './_components/lead-details-client';
import { type Uuid } from '@ims/shared-kernel';
import { prisma } from '@ims/database';

export const metadata = { title: 'Lead Details - CRM | ASTI IMS' };

// Forced reload: 2026-07-01T09:08

export default async function LeadDetailsPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auditPage?: string; followUpPage?: string }>;
}) {
  const { id: leadId } = await props.params;
  const searchParams = await props.searchParams;

  // Enforce lead read permissions
  const session = await assertPermission('lead.read');

  const { branchScopeResolver, leadService } = await import('@/lib/runtime');

  const lead = await leadService.getLeadById(leadId);
  if (!lead) {
    notFound();
  }

  // Branch Scope Check
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any
  );
  if (allowedBranchIds.length > 0 && !allowedBranchIds.includes(lead.branchId as Uuid)) {
    throw new Error('ERR_CRM_BRANCH_SCOPE_VIOLATION');
  }

  // Counselor Scope Check
  const hasGlobalRead = session.permissions.includes('crm.leads.read.all');
  if (!hasGlobalRead && lead.counselorId !== session.userId) {
    throw new Error('ERR_CRM_ASSIGNED_LEAD_SCOPE_VIOLATION');
  }

  // Fetch multiple notes
  const rawNotes = await prisma.leadNote.findMany({
    where: { leadId },
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: {
          username: true,
        },
      },
    },
  });

  const notes = rawNotes.map((n) => ({
    id: n.id,
    content: n.content,
    createdAt: n.createdAt.toISOString(),
    authorName: n.author?.username || 'System',
  }));

  // Fetch all LeadStageHistory records for the chronological timeline chart
  const stageHistoryLogs = await prisma.leadStageHistory.findMany({
    where: { leadId },
    orderBy: { performedAt: 'asc' },
    include: {
      performer: {
        select: {
          username: true,
        },
      },
    },
  });

  const mappedStageHistory = stageHistoryLogs.map((log) => ({
    id: log.id,
    performedAt: log.performedAt.toISOString(),
    performerName: log.performer?.username || 'System',
    oldStage: log.oldStage,
    newStage: log.newStage,
    lostReasonCode: log.lostReasonCode,
    lostReasonNotes: log.lostReasonNotes,
  }));

  // Fetch paginated follow-ups (display last 10 records)
  const followUpPage = searchParams.followUpPage ? parseInt(searchParams.followUpPage, 10) : 1;
  const followUpLimit = 10;
  const followUpSkip = (followUpPage - 1) * followUpLimit;

  const [followUps, followUpsTotal] = await Promise.all([
    prisma.leadFollowUp.findMany({
      where: { leadId, isDeleted: false },
      orderBy: { followUpDate: 'desc' },
      skip: followUpSkip,
      take: followUpLimit,
    }),
    prisma.leadFollowUp.count({
      where: { leadId, isDeleted: false },
    }),
  ]);

  const mappedFollowUps = followUps.map((f) => ({
    id: f.id,
    followUpDate: f.followUpDate.toISOString(),
    followUpType: f.followUpType,
    agenda: f.notes || '',
    outcome: f.outcome,
    notes: f.notes,
    status: f.status,
  }));

  // Fetch paginated audit history logs
  const auditPage = searchParams.auditPage ? parseInt(searchParams.auditPage, 10) : 1;
  const auditLimit = 5;
  const auditSkip = (auditPage - 1) * auditLimit;

  const [auditLogs, auditLogsTotal] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        entityType: 'Lead',
        entityId: leadId,
      },
      orderBy: { performedAt: 'desc' },
      skip: auditSkip,
      take: auditLimit,
    }),
    prisma.auditLog.count({
      where: {
        entityType: 'Lead',
        entityId: leadId,
      },
    }),
  ]);

  const performerIds = auditLogs.map((l) => l.performedBy).filter(Boolean) as string[];
  const performers = await prisma.user.findMany({
    where: { id: { in: performerIds } },
    select: { id: true, username: true },
  });
  const performerMap = new Map(performers.map((p) => [p.id, p.username]));

  const mappedAuditLogs = auditLogs.map((log) => ({
    id: log.id,
    action: log.action,
    performedAt: log.performedAt.toISOString(),
    performerName: log.performedBy ? performerMap.get(log.performedBy) || 'System' : 'System',
    oldValue: log.oldValue ? JSON.stringify(log.oldValue) : null,
    newValue: log.newValue ? JSON.stringify(log.newValue) : null,
  }));

  // Map database lead fields to match UI expectations
  const mappedLead = {
    ...lead,
    branch: lead.branch ? { id: lead.branchId, name: lead.branch.branchName } : null,
    counselor: lead.counselor ? { id: lead.counselorId, name: lead.counselor.username } : null,
    interestedCourse: lead.interestedCourse ? { id: lead.interestedCourseId, nameEnglish: lead.interestedCourse.name } : null,
  };

  return (
    <div className="p-6">
      <LeadDetailsClient
        lead={mappedLead}
        sessionUserId={session.userId}
        notes={notes}
        stageHistory={mappedStageHistory}
        followUps={mappedFollowUps}
        followUpsTotal={followUpsTotal}
        currentFollowUpPage={followUpPage}
        auditLogs={mappedAuditLogs}
        auditTotal={auditLogsTotal}
        currentAuditPage={auditPage}
      />
    </div>
  );
}
