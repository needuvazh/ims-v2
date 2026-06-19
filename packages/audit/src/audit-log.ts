import type { AuditMetadata } from '@ims/shared-kernel';

export type AuditLogEntry = AuditMetadata & {
  id: string;
};

export interface AuditLogRepository {
  append(entry: AuditLogEntry): Promise<void>;
}

export class InMemoryAuditLogRepository implements AuditLogRepository {
  private readonly entries: AuditLogEntry[] = [];

  async append(entry: AuditLogEntry) {
    this.entries.push(entry);
  }

  list() {
    return [...this.entries];
  }
}
