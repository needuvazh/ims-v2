import { InMemoryAuditLogRepository } from '@ims/audit';
import { InMemoryOrganizationRepository, OrganizationService } from '@ims/organization';

const organizationRepository = new InMemoryOrganizationRepository();
const auditRepository = new InMemoryAuditLogRepository();

export const organizationService = new OrganizationService(organizationRepository, auditRepository);

