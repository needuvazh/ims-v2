import re

with open("packages/database/prisma/schema.prisma", "r") as f:
    content = f.read()

# 1. Add Person model before User model
person_model = """
model Person {
  id          String    @id @default(uuid()) @db.Uuid
  firstName   String    @db.VarChar(100)
  lastName    String    @db.VarChar(100)
  mobile      String    @unique @db.VarChar(30)
  nationalId  String?   @db.VarChar(50)
  nationality String?   @db.VarChar(50)
  dateOfBirth DateTime? @db.Date
  gender      String?   @db.VarChar(20)

  user User?

  createdAt DateTime  @default(now()) @db.Timestamptz(6)
  createdBy String?   @db.Uuid
  updatedAt DateTime? @db.Timestamptz(6)
  updatedBy String?   @db.Uuid
  deletedAt DateTime? @db.Timestamptz(6)
  deletedBy String?   @db.Uuid
  isDeleted Boolean   @default(false)

  @@map("persons")
}
"""
content = re.sub(r'model User \{', person_model + '\nmodel User {', content)

# 2. Refactor User model
user_pattern = r'model User \{.*?\n\}'
user_replacement = """model User {
  id                String     @id @default(uuid()) @db.Uuid
  personId          String     @unique @db.Uuid
  username          String     @unique @db.VarChar(100)
  email             String     @unique @db.VarChar(255)
  passwordHash      String     @db.Text
  userType          String     @db.VarChar(50)
  status            UserStatus @default(Active)
  defaultBranchId   String?    @db.Uuid
  preferredLanguage String     @default("en") @db.VarChar(10)
  lastLoginAt       DateTime?  @db.Timestamptz(6)

  // Security & lockout fields
  failedLoginCount    Int       @default(0)
  lockedUntil         DateTime? @db.Timestamptz(6)
  passwordChangedAt   DateTime? @db.Timestamptz(6)
  version             Int       @default(1)

  // Effective dating
  effectiveStartDate DateTime  @default(now()) @db.Date
  effectiveEndDate   DateTime? @db.Date

  person          Person               @relation(fields: [personId], references: [id])
  roles           UserRole[]
  branchAccess    UserBranchAccess[]
  managedBranches Branch[]             @relation("BranchManager")
  sessions        UserSession[]
  loginRecords    LoginHistory[]
  resetTokens     PasswordResetToken[]
  passwordHistory PasswordHistory[]
  activationTokens UserActivationToken[]

  createdAt DateTime  @default(now()) @db.Timestamptz(6)
  createdBy String?   @db.Uuid
  updatedAt DateTime? @db.Timestamptz(6)
  updatedBy String?   @db.Uuid
  deletedAt DateTime? @db.Timestamptz(6)
  deletedBy String?   @db.Uuid
  isDeleted Boolean   @default(false)

  leads     Lead[]         @relation("CounselorLeads")
  followUps LeadFollowUp[] @relation("CounselorFollowUps")

  @@index([status])
  @@map("users")
}"""
content = re.sub(user_pattern, user_replacement, content, flags=re.DOTALL)

# 3. Add UserBranchAccess, PasswordHistory, UserActivationToken, SecurityPolicy
new_models = """

model UserBranchAccess {
  id                     String  @id @default(uuid()) @db.Uuid
  userId                 String  @db.Uuid
  branchId               String  @db.Uuid
  isDefault              Boolean @default(false)
  includeChildBranches   Boolean @default(false)
  consolidatedVisibility Boolean @default(false)
  status                 String  @db.VarChar(50) // "Active", "Revoked"
  revokedAt              DateTime? @db.Timestamptz(6)
  revokedBy              String?   @db.Uuid
  reason                 String?   @db.Text

  user   User   @relation(fields: [userId], references: [id])
  branch Branch @relation(fields: [branchId], references: [id])

  createdAt DateTime  @default(now()) @db.Timestamptz(6)
  createdBy String?   @db.Uuid
  updatedAt DateTime? @db.Timestamptz(6)
  updatedBy String?   @db.Uuid

  @@unique([userId, branchId])
  @@map("user_branch_access")
}

model PasswordHistory {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @db.Uuid
  passwordHash String   @db.Text
  createdAt    DateTime @default(now()) @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("password_history")
}

model UserActivationToken {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @db.Uuid
  tokenHash String    @db.Text
  expiresAt DateTime  @db.Timestamptz(6)
  status    String    @db.VarChar(50) // "Pending", "Used", "Expired"
  usedAt    DateTime? @db.Timestamptz(6)
  createdAt DateTime  @default(now()) @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id])

  @@index([tokenHash, status])
  @@map("user_activation_tokens")
}

model SecurityPolicy {
  id                           String   @id @default(uuid()) @db.Uuid
  maxFailedAttempts            Int      @default(5)
  lockoutDurationMinutes       Int      @default(30)
  passwordMinLength            Int      @default(8)
  passwordRequireUppercase     Boolean  @default(true)
  passwordRequireLowercase     Boolean  @default(true)
  passwordRequireNumbers       Boolean  @default(true)
  passwordRequireSpecial       Boolean  @default(true)
  passwordHistoryCount         Int      @default(5)
  passwordExpiryDays           Int      @default(90)
  resetTokenExpiryMinutes      Int      @default(15)
  accessTokenExpiryMinutes     Int      @default(15)
  refreshTokenExpiryDays       Int      @default(7)
  rememberMeRefreshTokenDays   Int      @default(30)
  sessionInactivityMinutes     Int      @default(30)
  maxConcurrentSessions        Int      @default(3)
  
  createdAt DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt DateTime? @db.Timestamptz(6)

  @@map("security_policies")
}

model Notification {
  id               String   @id @default(uuid()) @db.Uuid
  type             String   @db.VarChar(100)
  recipientUserId  String?  @db.Uuid
  recipientEmail   String   @db.VarChar(255)
  subject          String   @db.VarChar(255)
  body             String   @db.Text
  status           String   @db.VarChar(50) // "Pending", "Sent", "Failed"
  metadata         Json?
  providerResponse Json?
  createdAt        DateTime @default(now()) @db.Timestamptz(6)
  updatedAt        DateTime? @db.Timestamptz(6)

  @@map("notifications")
}

model ExportJob {
  id           String   @id @default(uuid()) @db.Uuid
  reportType   String   @db.VarChar(150)
  requestedBy  String   @db.Uuid
  branchId     String?  @db.Uuid
  filters      Json?
  format       String   @db.VarChar(50) // "CSV", "XLSX", "PDF"
  status       String   @db.VarChar(50) // "Pending", "Processing", "Done", "Failed"
  fileUrl      String?  @db.Text
  errorMessage String?  @db.Text
  createdAt    DateTime @default(now()) @db.Timestamptz(6)
  updatedAt    DateTime? @db.Timestamptz(6)

  @@map("export_jobs")
}
"""

# 4. Remove UserDataScope
data_scope_pattern = r'model UserDataScope \{.*?\n\}\n'
content = re.sub(data_scope_pattern, '', content, flags=re.DOTALL)

# Insert the new models right after UserSession for example
content = re.sub(r'model UserSession \{', new_models + '\nmodel UserSession {', content)

# 5. Expand AuditLog
audit_log_pattern = r'model AuditLog \{.*?\n\}'
audit_log_replacement = """model AuditLog {
  id            String   @id @default(uuid()) @db.Uuid
  performedBy   String?  @db.Uuid
  performedAt   DateTime @default(now()) @db.Timestamptz(6)
  entityType    String   @db.VarChar(150)
  entityId      String   @db.VarChar(150)
  action        String   @db.VarChar(150)
  oldValue      Json?
  newValue      Json?
  ipAddress     String?  @db.VarChar(45)
  userAgent     String?  @db.Text
  branchId      String?  @db.Uuid
  correlationId String?  @db.VarChar(100)
  reason        String?  @db.Text
  module        String?  @db.VarChar(100)

  createdAt  DateTime @default(now()) @db.Timestamptz(6)

  @@index([entityType, entityId])
  @@index([performedBy])
  @@index([performedAt])
  @@index([branchId])
  @@map("audit_logs")
}"""
content = re.sub(audit_log_pattern, audit_log_replacement, content, flags=re.DOTALL)

# 6. Add index on UserSession and activeBranchId
user_session_pattern = r'model UserSession \{.*?\n\}'
user_session_replacement = """model UserSession {
  id             String   @id @default(uuid()) @db.Uuid
  userId         String   @db.Uuid
  tokenHash      String   @unique @db.Text
  userAgent      String?  @db.Text
  ipAddress      String?  @db.VarChar(45)
  status         String   @db.VarChar(50) // "Active", "Expired", "Revoked"
  expiresAt      DateTime @db.Timestamptz(6)
  lastAccessAt   DateTime @db.Timestamptz(6)
  activeBranchId String?  @db.Uuid

  user User @relation(fields: [userId], references: [id])

  createdAt DateTime @default(now()) @db.Timestamptz(6)

  @@index([userId])
  @@index([status])
  @@index([userId, status])
  @@map("user_sessions")
}"""
content = re.sub(user_session_pattern, user_session_replacement, content, flags=re.DOTALL)

# 7. Add attemptedEmail to LoginHistory, rename status/reason, fix userId
login_history_pattern = r'model LoginHistory \{.*?\n\}'
login_history_replacement = """model LoginHistory {
  id             String   @id @default(uuid()) @db.Uuid
  attemptedEmail String   @db.VarChar(255)
  userId         String?  @db.Uuid
  ipAddress      String?  @db.VarChar(45)
  userAgent      String?  @db.Text
  browser        String?  @db.VarChar(100)
  os             String?  @db.VarChar(100)
  device         String?  @db.VarChar(100)
  status         String   @db.VarChar(50) // "Success", "Failure"
  failureReason  String?  @db.VarChar(150)
  branchId       String?  @db.Uuid
  createdAt      DateTime @default(now()) @db.Timestamptz(6)

  user User? @relation(fields: [userId], references: [id])

  @@index([attemptedEmail])
  @@index([userId])
  @@index([createdAt])
  @@map("login_history")
}"""
content = re.sub(login_history_pattern, login_history_replacement, content, flags=re.DOTALL)

# 8. Role - add isSystemRole and version
role_pattern = r'model Role \{.*?\n\}'
def add_role_fields(match):
    text = match.group(0)
    # Add after description
    text = re.sub(r'(description String\?      @db\.Text)', r'\1\n  isSystemRole Boolean      @default(false)\n  version      Int          @default(1)', text)
    return text
content = re.sub(role_pattern, add_role_fields, content, flags=re.DOTALL)

with open("packages/database/prisma/schema.prisma", "w") as f:
    f.write(content)

