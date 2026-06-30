import re

with open("packages/database/prisma/seed.ts", "r") as f:
    content = f.read()

# Replace identity permissions
identity_perms = """  // Identity & Access (RBAC)
  { moduleCode: 'iam', featureCode: 'user', actionCode: 'read', permissionCode: 'iam.user.read', permissionType: 'Action' as const, description: 'View users.' },
  { moduleCode: 'iam', featureCode: 'user', actionCode: 'create', permissionCode: 'iam.user.create', permissionType: 'Action' as const, description: 'Create users.' },
  { moduleCode: 'iam', featureCode: 'user', actionCode: 'update', permissionCode: 'iam.user.update', permissionType: 'Action' as const, description: 'Update users.' },
  { moduleCode: 'iam', featureCode: 'user', actionCode: 'archive', permissionCode: 'iam.user.archive', permissionType: 'Action' as const, description: 'Archive users.' },
  { moduleCode: 'iam', featureCode: 'user', actionCode: 'activate', permissionCode: 'iam.user.activate', permissionType: 'Action' as const, description: 'Activate users.' },
  { moduleCode: 'iam', featureCode: 'user', actionCode: 'suspend', permissionCode: 'iam.user.suspend', permissionType: 'Action' as const, description: 'Suspend users.' },
  { moduleCode: 'iam', featureCode: 'user', actionCode: 'unlock', permissionCode: 'iam.user.unlock', permissionType: 'Action' as const, description: 'Unlock users.' },
  { moduleCode: 'iam', featureCode: 'user', actionCode: 'reset-password', permissionCode: 'iam.user.reset-password', permissionType: 'Action' as const, description: 'Reset user passwords.' },
  { moduleCode: 'iam', featureCode: 'user', actionCode: 'export', permissionCode: 'iam.user.export', permissionType: 'Action' as const, description: 'Export users.' },
  { moduleCode: 'iam', featureCode: 'user', actionCode: 'import', permissionCode: 'iam.user.import', permissionType: 'Action' as const, description: 'Import users.' },
  { moduleCode: 'iam', featureCode: 'user', actionCode: 'assign-role', permissionCode: 'iam.user.assign-role', permissionType: 'Action' as const, description: 'Assign roles to users.' },
  { moduleCode: 'iam', featureCode: 'user', actionCode: 'assign-branch', permissionCode: 'iam.user.assign-branch', permissionType: 'Action' as const, description: 'Assign branches to users.' },
  { moduleCode: 'iam', featureCode: 'user', actionCode: 'view-login-history', permissionCode: 'iam.user.view-login-history', permissionType: 'Action' as const, description: 'View user login history.' },
  { moduleCode: 'iam', featureCode: 'user', actionCode: 'view-sessions', permissionCode: 'iam.user.view-sessions', permissionType: 'Action' as const, description: 'View user sessions.' },
  { moduleCode: 'iam', featureCode: 'role', actionCode: 'read', permissionCode: 'iam.role.read', permissionType: 'Action' as const, description: 'View roles.' },
  { moduleCode: 'iam', featureCode: 'role', actionCode: 'create', permissionCode: 'iam.role.create', permissionType: 'Action' as const, description: 'Create roles.' },
  { moduleCode: 'iam', featureCode: 'role', actionCode: 'update', permissionCode: 'iam.role.update', permissionType: 'Action' as const, description: 'Update roles.' },
  { moduleCode: 'iam', featureCode: 'role', actionCode: 'archive', permissionCode: 'iam.role.archive', permissionType: 'Action' as const, description: 'Archive roles.' },
  { moduleCode: 'iam', featureCode: 'role', actionCode: 'assign', permissionCode: 'iam.role.assign', permissionType: 'Action' as const, description: 'Assign roles.' },
  { moduleCode: 'iam', featureCode: 'permission', actionCode: 'read', permissionCode: 'iam.permission.read', permissionType: 'Action' as const, description: 'View permissions.' },
  { moduleCode: 'iam', featureCode: 'permission', actionCode: 'create', permissionCode: 'iam.permission.create', permissionType: 'Action' as const, description: 'Create permissions.' },
  { moduleCode: 'iam', featureCode: 'permission', actionCode: 'update', permissionCode: 'iam.permission.update', permissionType: 'Action' as const, description: 'Update permissions.' },
  { moduleCode: 'iam', featureCode: 'permission', actionCode: 'archive', permissionCode: 'iam.permission.archive', permissionType: 'Action' as const, description: 'Archive permissions.' },
  { moduleCode: 'iam', featureCode: 'role', actionCode: 'assign-permission', permissionCode: 'iam.role.permission.assign', permissionType: 'Action' as const, description: 'Assign permissions to roles.' },
  { moduleCode: 'iam', featureCode: 'session', actionCode: 'read', permissionCode: 'iam.session.read', permissionType: 'Action' as const, description: 'Read sessions.' },
  { moduleCode: 'iam', featureCode: 'session', actionCode: 'terminate', permissionCode: 'iam.session.terminate', permissionType: 'Action' as const, description: 'Terminate sessions.' },
  { moduleCode: 'iam', featureCode: 'security-policy', actionCode: 'read', permissionCode: 'iam.security-policy.read', permissionType: 'Action' as const, description: 'Read security policy.' },
  { moduleCode: 'iam', featureCode: 'security-policy', actionCode: 'update', permissionCode: 'iam.security-policy.update', permissionType: 'Action' as const, description: 'Update security policy.' },
  { moduleCode: 'iam', featureCode: 'audit', actionCode: 'read', permissionCode: 'iam.audit.read', permissionType: 'Action' as const, description: 'View audit logs.' },
"""
content = re.sub(
    r'  // Identity & Access \(RBAC\)\n.*?(?=  // CRM / Leads Management)',
    identity_perms,
    content,
    flags=re.DOTALL
)

# Remove old dashboard and audit permissions
content = re.sub(
    r'  // Dashboard & Audit\n.*?(?=];)',
    r"""  // Dashboard & Audit
  { moduleCode: 'dashboard',    featureCode: 'summary',     actionCode: 'view',   permissionCode: 'dashboard.view',                 permissionType: 'Action' as const, description: 'View dashboard metrics.' },
  { moduleCode: 'report',       featureCode: 'reports',     actionCode: 'read',   permissionCode: 'reports.read',                   permissionType: 'Action' as const, description: 'View reports.' },
""",
    content,
    flags=re.DOTALL
)

# Fix role assignments
manager_perms_old = r"'identity\.read', 'lead\.read', 'lead\.write', 'lead\.convert',\n\s*'student\.read', 'student\.write', 'enrollment\.create',\n\s*'payment\.create', 'refund\.request', 'course\.manage', 'schedule\.manage',\n\s*'attendance\.record', 'result\.record', 'certificate\.generate',\n\s*'certificate\.verify', 'dashboard\.view', 'audit\.view'"
manager_perms_new = r"'iam.user.read', 'iam.role.read', 'lead.read', 'lead.write', 'lead.convert',\n    'student.read', 'student.write', 'enrollment.create',\n    'payment.create', 'refund.request', 'course.manage', 'schedule.manage',\n    'attendance.record', 'result.record', 'certificate.generate',\n    'certificate.verify', 'dashboard.view', 'iam.audit.read'"
content = re.sub(manager_perms_old, manager_perms_new, content)

counselor_perms_old = r"'identity\.read', 'lead\.read', 'lead\.write', 'lead\.convert',\n\s*'student\.read', 'dashboard\.view'"
counselor_perms_new = r"'iam.user.read', 'lead.read', 'lead.write', 'lead.convert',\n    'student.read', 'dashboard.view'"
content = re.sub(counselor_perms_old, counselor_perms_new, content)

# Clean up existing records: add new ones
cleanup_old = r"await prisma\.userDataScope\.deleteMany\(\{\}\);\n\s*await prisma\.userRole\.deleteMany\(\{\}\);"
cleanup_new = r"""await prisma.userBranchAccess.deleteMany({});
  await prisma.userActivationToken.deleteMany({});
  await prisma.passwordHistory.deleteMany({});
  await prisma.securityPolicy.deleteMany({});
  await prisma.userRole.deleteMany({});"""
content = re.sub(cleanup_old, cleanup_new, content)

# Remove UserDataScope creation
content = re.sub(r'  await prisma\.userDataScope\.create\(\{\n.*?\}\);\n', '', content, flags=re.DOTALL)

# Add UserBranchAccess creation and Person creation
def replace_user(match):
    user_var = match.group(1)
    full_name = match.group(2)
    email = match.group(3)
    user_type = match.group(4)
    branch_id = match.group(5)
    
    parts = full_name.split(' ', 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else 'User'

    person_creation = f"""
  const {user_var}Person = await prisma.person.create({{
    data: {{
      id: crypto.randomUUID(),
      firstName: '{first_name}',
      lastName: '{last_name}',
      mobile: '+966-5' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0'),
    }}
  }});
"""
    user_creation = f"""
  const {user_var}User = await prisma.user.create({{
    data: {{
      id: crypto.randomUUID(),
      personId: {user_var}Person.id,
      username: '{email}',
      email: '{email}',
      userType: '{user_type}',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    }},
  }});
  await prisma.userRole.create({{
    data: {{ userId: {user_var}User.id, roleId: roleMap['"""
    return person_creation + user_creation

# This is a bit complex, let's just write a python script that does all the replacements
with open("packages/database/prisma/seed.ts", "w") as f:
    f.write(content)

