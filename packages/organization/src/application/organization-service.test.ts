import { describe, expect, it } from 'vitest';
import { InMemoryAuditLogRepository } from '@ims/audit';
import { createUuid } from '@ims/shared-kernel';
import { InMemoryOrganizationRepository, OrganizationService } from './organization-service';

describe('organization service', () => {
  it('creates institutes and records audit logs', async () => {
    const repository = new InMemoryOrganizationRepository();
    const audit = new InMemoryAuditLogRepository();
    const service = new OrganizationService(repository, audit);

    const result = await service.createInstitute(
      {
        instituteCode: 'IMS',
        instituteName: 'Institute Management System',
        primaryEmail: 'hello@example.com',
      },
      { actorId: createUuid('33333333-3333-3333-3333-333333333333') },
    );

    expect(result.institute.instituteCode).toBe('IMS');
    expect(audit.list()).toHaveLength(1);
  });
});
