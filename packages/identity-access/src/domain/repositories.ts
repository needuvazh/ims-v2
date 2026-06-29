import type { User, Person, UserListFilters } from './user';
import type { Role } from './role';
import type { Permission } from './permission';
import type { UserBranchAccess } from './user-branch-access';
import type { SecurityPolicy } from './security-policy';
import type { Uuid } from '@ims/shared-kernel';

export interface IUserRepository {
  findById(id: Uuid): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findPersonById(id: Uuid): Promise<Person | null>;
  findPersonByMobile(mobile: string): Promise<Person | null>;
  create(user: User, person: Person): Promise<User>;
  update(user: User, person?: Person): Promise<User>;
  search(filters: UserListFilters, page: number, pageSize: number): Promise<{ items: User[]; total: number }>;
  getPasswordHash(userId: Uuid): Promise<string | null>;
  updatePassword(userId: Uuid, passwordHash: string): Promise<void>;
  createResetToken(data: { id: Uuid; userId: Uuid; tokenHash: string; expiresAt: Date }): Promise<void>;
  findResetTokenByHash(tokenHash: string): Promise<{ userId: Uuid; expiresAt: Date; usedAt: Date | null } | null>;
  markResetTokenAsUsed(tokenHash: string): Promise<void>;
}

export interface IRoleRepository {
  findById(id: Uuid): Promise<Role | null>;
  findByCode(code: string): Promise<Role | null>;
  create(role: Role): Promise<Role>;
  update(role: Role): Promise<Role>;
  search(page: number, pageSize: number): Promise<{ items: Role[]; total: number }>;
  
  assignRoleToUser(userId: Uuid, roleId: Uuid, actorId: Uuid): Promise<void>;
  revokeRoleFromUser(userId: Uuid, roleId: Uuid, actorId: Uuid, reason: string | null): Promise<void>;
  listRolesForUser(userId: Uuid): Promise<{ role: Role; status: string; revokedAt: Date | null; revokedBy: string | null; reason: string | null }[]>;
  
  assignPermissionToRole(roleId: Uuid, permissionId: Uuid, actorId: Uuid): Promise<void>;
  removePermissionFromRole(roleId: Uuid, permissionId: Uuid): Promise<void>;
  listPermissionsForRole(roleId: Uuid): Promise<Permission[]>;
}

export interface IPermissionRepository {
  findById(id: Uuid): Promise<Permission | null>;
  findByCode(code: string): Promise<Permission | null>;
  create(permission: Permission): Promise<Permission>;
  update(permission: Permission): Promise<Permission>;
  search(type?: string, status?: string): Promise<Permission[]>;
}

export interface IUserBranchAccessRepository {
  findByUser(userId: Uuid): Promise<UserBranchAccess[]>;
  findById(id: Uuid): Promise<UserBranchAccess | null>;
  assign(access: UserBranchAccess): Promise<UserBranchAccess>;
  update(access: UserBranchAccess): Promise<UserBranchAccess>;
}

export interface UserSessionDto {
  id: Uuid;
  userId: Uuid;
  accessTokenJti: string;
  hashedRefreshToken: string;
  activeBranchId: Uuid | null;
  userAgent: string | null;
  ipAddress: string | null;
  status: 'Active' | 'Revoked' | 'Expired';
  expiresAt: Date;
  lastActivityAt: Date;
  createdAt: Date;
}

export interface ISessionRepository {
  create(session: UserSessionDto): Promise<UserSessionDto>;
  findById(id: Uuid): Promise<UserSessionDto | null>;
  findByAccessTokenJti(jti: string): Promise<UserSessionDto | null>;
  findByHashedRefreshToken(hash: string): Promise<UserSessionDto | null>;
  update(session: UserSessionDto): Promise<UserSessionDto>;
  revoke(id: Uuid): Promise<void>;
  revokeAllForUser(userId: Uuid): Promise<void>;
  listActiveForUser(userId: Uuid): Promise<UserSessionDto[]>;
}

export interface PasswordHistoryDto {
  id: Uuid;
  userId: Uuid;
  passwordHash: string;
  createdAt: Date;
}

export interface IPasswordHistoryRepository {
  append(history: PasswordHistoryDto): Promise<void>;
  findRecentN(userId: Uuid, limit: number): Promise<PasswordHistoryDto[]>;
}

export interface UserActivationTokenDto {
  id: Uuid;
  userId: Uuid;
  tokenHash: string;
  expiresAt: Date;
  status: 'Pending' | 'Used' | 'Expired';
  createdAt: Date;
  usedAt: Date | null;
}

export interface IUserActivationTokenRepository {
  create(token: UserActivationTokenDto): Promise<UserActivationTokenDto>;
  findByHash(hash: string): Promise<UserActivationTokenDto | null>;
  update(token: UserActivationTokenDto): Promise<UserActivationTokenDto>;
  invalidatePendingForUser(userId: Uuid): Promise<void>;
}

export interface ISecurityPolicyRepository {
  get(): Promise<SecurityPolicy>;
  update(policy: SecurityPolicy): Promise<SecurityPolicy>;
}

export interface AuditLogDto {
  id: Uuid;
  module: string;
  performedBy: Uuid | null;
  performedAt: Date;
  entityType: string;
  entityId: string;
  action: string;
  oldValue: any;
  newValue: any;
  ipAddress: string | null;
  userAgent: string | null;
  branchId: Uuid | null;
  correlationId: string | null;
  reason: string | null;
}

export interface IAuditLogRepository {
  append(log: AuditLogDto): Promise<void>;
  list(filters: {
    entityType?: string;
    entityId?: string;
    action?: string;
    performerId?: string;
    startDate?: Date;
    endDate?: Date;
    branchId?: string;
    module?: string;
  }, page: number, pageSize: number): Promise<{ items: AuditLogDto[]; total: number }>;
  findById(id: Uuid): Promise<AuditLogDto | null>;
}

export interface NotificationDto {
  id: Uuid;
  type: string;
  recipientUserId: Uuid;
  recipientEmail: string;
  subject: string;
  body: string;
  status: 'Pending' | 'Sent' | 'Failed';
  metadata: any;
  providerResponse: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationRepository {
  create(notification: NotificationDto): Promise<NotificationDto>;
  update(notification: NotificationDto): Promise<NotificationDto>;
  findById(id: Uuid): Promise<NotificationDto | null>;
  listPending(limit: number): Promise<NotificationDto[]>;
}

export interface OutboxEventDto {
  id: Uuid;
  eventType: string;
  payload: any;
  status: 'Pending' | 'Processed' | 'Failed';
  createdAt: Date;
  processedAt: Date | null;
  retryCount: number;
}

export interface IOutboxEventRepository {
  publish(event: OutboxEventDto): Promise<OutboxEventDto>;
  claimPending(limit: number): Promise<OutboxEventDto[]>;
  update(event: OutboxEventDto): Promise<OutboxEventDto>;
}

export interface ExportJobDto {
  id: Uuid;
  reportType: string;
  requestedBy: Uuid;
  branchId: Uuid | null;
  filters: any;
  format: 'CSV' | 'XLSX' | 'PDF';
  status: 'Pending' | 'Processing' | 'Done' | 'Failed';
  fileUrl: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExportJobRepository {
  create(job: ExportJobDto): Promise<ExportJobDto>;
  update(job: ExportJobDto): Promise<ExportJobDto>;
  findById(id: Uuid): Promise<ExportJobDto | null>;
  listByUser(userId: Uuid): Promise<ExportJobDto[]>;
}

export interface LoginHistoryDto {
  id: Uuid;
  userId: Uuid | null;
  attemptedEmail: string;
  ipAddress: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  status: 'Success' | 'Failure';
  failureReason: string | null;
  branchId: Uuid | null;
  createdAt: Date;
}

export interface ILoginHistoryRepository {
  append(record: LoginHistoryDto): Promise<void>;
  findByUser(userId: Uuid, page: number, pageSize: number): Promise<{ items: LoginHistoryDto[]; total: number }>;
  list(filters: { branchId?: string; status?: string; startDate?: Date; endDate?: Date }, page: number, pageSize: number): Promise<{ items: LoginHistoryDto[]; total: number }>;
}
