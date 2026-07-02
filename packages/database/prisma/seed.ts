import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const systemPermissions = [
  // Organization Management
  { moduleCode: 'organization', featureCode: 'institute',   actionCode: 'manage', permissionCode: 'organization.manage',            permissionType: 'Action' as const, description: 'Manage institutes and branches.' },
  { moduleCode: 'organization', featureCode: 'branch',      actionCode: 'manage', permissionCode: 'organization.branch.manage',     permissionType: 'Action' as const, description: 'Create and update branches.' },
  { moduleCode: 'organization', featureCode: 'department',  actionCode: 'manage', permissionCode: 'organization.department.manage', permissionType: 'Action' as const, description: 'Manage departments.' },
  { moduleCode: 'organization', featureCode: 'classroom',   actionCode: 'manage', permissionCode: 'organization.classroom.manage',  permissionType: 'Action' as const, description: 'Manage classrooms.' },
  
  // Identity & Access (RBAC)
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
  // CRM / Leads Management
  { moduleCode: 'crm',          featureCode: 'leads',       actionCode: 'read',   permissionCode: 'lead.read',                      permissionType: 'Action' as const, description: 'View leads.' },
  { moduleCode: 'crm',          featureCode: 'leads',       actionCode: 'write',  permissionCode: 'lead.write',                     permissionType: 'Action' as const, description: 'Create and update leads.' },
  { moduleCode: 'crm',          featureCode: 'leads',       actionCode: 'create', permissionCode: 'lead.create',                    permissionType: 'Action' as const, description: 'Create leads.' },
  { moduleCode: 'crm',          featureCode: 'leads',       actionCode: 'update', permissionCode: 'lead.update',                    permissionType: 'Action' as const, description: 'Update leads.' },
  { moduleCode: 'crm',          featureCode: 'leads',       actionCode: 'delete', permissionCode: 'lead.delete',                    permissionType: 'Action' as const, description: 'Delete leads.' },
  { moduleCode: 'crm',          featureCode: 'leads',       actionCode: 'assign', permissionCode: 'lead.assign',                    permissionType: 'Action' as const, description: 'Assign leads.' },
  { moduleCode: 'crm',          featureCode: 'leads',       actionCode: 'lost',   permissionCode: 'lead.lost',                      permissionType: 'Action' as const, description: 'Mark leads lost.' },
  { moduleCode: 'crm',          featureCode: 'leads',       actionCode: 'reveal_pii', permissionCode: 'lead.reveal_pii',            permissionType: 'Action' as const, description: 'Reveal lead PII.' },
  { moduleCode: 'crm',          featureCode: 'leads',       actionCode: 'qualify',permissionCode: 'lead.qualify',                   permissionType: 'Action' as const, description: 'Qualify inquiries.' },
  { moduleCode: 'crm',          featureCode: 'leads',       actionCode: 'convert',permissionCode: 'lead.convert',                   permissionType: 'Action' as const, description: 'Convert leads to admissions.' },
  { moduleCode: 'crm',          featureCode: 'leads',       actionCode: 'read.all',permissionCode: 'crm.leads.read.all',            permissionType: 'Action' as const, description: 'View all leads bypassing counselor scoping.' },
  { moduleCode: 'crm',          featureCode: 'followup',    actionCode: 'create', permissionCode: 'followup.create',                permissionType: 'Action' as const, description: 'Create lead follow-ups.' },
  { moduleCode: 'crm',          featureCode: 'followup',    actionCode: 'update', permissionCode: 'followup.update',                permissionType: 'Action' as const, description: 'Update lead follow-ups.' },
  
  // Admissions & Enrollments
  { moduleCode: 'enrollment',   featureCode: 'student',     actionCode: 'read',   permissionCode: 'student.read',                   permissionType: 'Action' as const, description: 'View student details.' },
  { moduleCode: 'enrollment',   featureCode: 'student',     actionCode: 'write',  permissionCode: 'student.write',                  permissionType: 'Action' as const, description: 'Register or edit student profiles.' },
  { moduleCode: 'enrollment',   featureCode: 'enroll',      actionCode: 'write',  permissionCode: 'enrollment.create',              permissionType: 'Action' as const, description: 'Create enrollments in courses/batches.' },
  
  // Finance & Fee Management
  { moduleCode: 'finance',      featureCode: 'payment',     actionCode: 'write',  permissionCode: 'payment.create',                 permissionType: 'Action' as const, description: 'Record payments and issue receipts.' },
  { moduleCode: 'finance',      featureCode: 'refund',      actionCode: 'request',permissionCode: 'refund.request',                 permissionType: 'Action' as const, description: 'Initiate a refund request.' },
  { moduleCode: 'finance',      featureCode: 'refund',      actionCode: 'approve',permissionCode: 'refund.approve',                 permissionType: 'Action' as const, description: 'Approve refund applications.' },
  
  // Course & Scheduling
  { moduleCode: 'courses',      featureCode: 'syllabus',    actionCode: 'manage', permissionCode: 'course.manage',                  permissionType: 'Action' as const, description: 'Manage courses, syllabus and pricing.' },
  { moduleCode: 'courses',      featureCode: 'catalog',    actionCode: 'view',    permissionCode: 'course.catalog.view',             permissionType: 'Action' as const, description: 'View course catalog.' },
  { moduleCode: 'courses',      featureCode: 'catalog',    actionCode: 'create',  permissionCode: 'course.catalog.create',           permissionType: 'Action' as const, description: 'Create course catalog entries.' },
  { moduleCode: 'courses',      featureCode: 'catalog',    actionCode: 'update',  permissionCode: 'course.catalog.update',           permissionType: 'Action' as const, description: 'Update course catalog entries.' },
  { moduleCode: 'courses',      featureCode: 'catalog',    actionCode: 'publish', permissionCode: 'course.catalog.publish',          permissionType: 'Action' as const, description: 'Publish courses in catalog.' },
  { moduleCode: 'courses',      featureCode: 'catalog',    actionCode: 'archive', permissionCode: 'course.catalog.archive',          permissionType: 'Action' as const, description: 'Archive courses in catalog.' },
  { moduleCode: 'courses',      featureCode: 'batches',    actionCode: 'view',    permissionCode: 'batch.delivery.view',             permissionType: 'Action' as const, description: 'View and manage course delivery batches.' },
  { moduleCode: 'courses',      featureCode: 'batches',    actionCode: 'assign',  permissionCode: 'batch.delivery.assign',           permissionType: 'Action' as const, description: 'Assign faculty/trainers to batches.' },
  { moduleCode: 'courses',      featureCode: 'batches',    actionCode: 'create',  permissionCode: 'batch.delivery.create',           permissionType: 'Action' as const, description: 'Create course delivery batches.' },
  { moduleCode: 'courses',      featureCode: 'batches',    actionCode: 'update',  permissionCode: 'batch.delivery.update',           permissionType: 'Action' as const, description: 'Update course delivery batches.' },
  { moduleCode: 'courses',      featureCode: 'batches',    actionCode: 'transition', permissionCode: 'batch.delivery.transition',      permissionType: 'Action' as const, description: 'Transition course delivery batches status.' },
  { moduleCode: 'scheduling',   featureCode: 'sessions',    actionCode: 'manage', permissionCode: 'schedule.manage',                permissionType: 'Action' as const, description: 'Create and update schedules.' },
  
  // Attendance & Completion
  { moduleCode: 'attendance',   featureCode: 'records',     actionCode: 'write',  permissionCode: 'attendance.record',              permissionType: 'Action' as const, description: 'Mark student attendance.' },
  { moduleCode: 'exams',        featureCode: 'results',     actionCode: 'write',  permissionCode: 'result.record',                  permissionType: 'Action' as const, description: 'Enter exam marks and grades.' },
  
  // Certificates
  { moduleCode: 'certificate',  featureCode: 'issue',       actionCode: 'write',  permissionCode: 'certificate.generate',           permissionType: 'Action' as const, description: 'Generate and issue certificates.' },
  { moduleCode: 'certificate',  featureCode: 'public',      actionCode: 'verify', permissionCode: 'certificate.verify',             permissionType: 'Action' as const, description: 'Verify certificates publicly.' },
  
  // Dashboard & Audit
  { moduleCode: 'dashboard',    featureCode: 'summary',     actionCode: 'view',   permissionCode: 'dashboard.view',                 permissionType: 'Action' as const, description: 'View dashboard metrics.' },
  { moduleCode: 'dashboard',    featureCode: 'security',    actionCode: 'view',   permissionCode: 'dashboard.security',            permissionType: 'Action' as const, description: 'View security dashboard.' },
  { moduleCode: 'dashboard',    featureCode: 'admin',       actionCode: 'view',   permissionCode: 'dashboard.admin',               permissionType: 'Action' as const, description: 'View administration dashboard.' },
  { moduleCode: 'dashboard',    featureCode: 'ceo',         actionCode: 'view',   permissionCode: 'dashboard.ceo',                 permissionType: 'Action' as const, description: 'View executive dashboard.' },
  { moduleCode: 'dashboard',    featureCode: 'compliance',  actionCode: 'view',   permissionCode: 'dashboard.compliance',          permissionType: 'Action' as const, description: 'View compliance dashboard.' },
  { moduleCode: 'dashboard',    featureCode: 'branch',      actionCode: 'view',   permissionCode: 'dashboard.branch',              permissionType: 'Action' as const, description: 'View branch dashboard.' },
  { moduleCode: 'dashboard',    featureCode: 'finance',     actionCode: 'view',   permissionCode: 'dashboard.finance',             permissionType: 'Action' as const, description: 'View finance dashboard.' },
  { moduleCode: 'dashboard',    featureCode: 'training',    actionCode: 'view',   permissionCode: 'dashboard.training',            permissionType: 'Action' as const, description: 'View training dashboard.' },
  { moduleCode: 'dashboard',    featureCode: 'crm',         actionCode: 'view',   permissionCode: 'dashboard.crm',                 permissionType: 'Action' as const, description: 'View CRM dashboard.' },
  { moduleCode: 'report',       featureCode: 'iam',         actionCode: 'user',   permissionCode: 'report.iam.user',               permissionType: 'Report' as const, description: 'View user directory report.' },
  { moduleCode: 'report',       featureCode: 'iam',         actionCode: 'user-access', permissionCode: 'report.iam.user-access',     permissionType: 'Report' as const, description: 'View user access report.' },
  { moduleCode: 'report',       featureCode: 'iam',         actionCode: 'login-history', permissionCode: 'report.iam.login-history', permissionType: 'Report' as const, description: 'View login history report.' },
  { moduleCode: 'report',       featureCode: 'iam',         actionCode: 'security', permissionCode: 'report.iam.security',          permissionType: 'Report' as const, description: 'View security report.' },
  { moduleCode: 'report',       featureCode: 'iam',         actionCode: 'role',    permissionCode: 'report.iam.role',               permissionType: 'Report' as const, description: 'View role report.' },
  { moduleCode: 'report',       featureCode: 'iam',         actionCode: 'permission', permissionCode: 'report.iam.permission',      permissionType: 'Report' as const, description: 'View permission report.' },
  { moduleCode: 'report',       featureCode: 'iam',         actionCode: 'branch',  permissionCode: 'report.iam.branch',             permissionType: 'Report' as const, description: 'View branch access report.' },
  { moduleCode: 'report',       featureCode: 'iam',         actionCode: 'privileged', permissionCode: 'report.iam.privileged',      permissionType: 'Report' as const, description: 'View privileged users report.' },
  { moduleCode: 'report',       featureCode: 'iam',         actionCode: 'session', permissionCode: 'report.iam.session',           permissionType: 'Report' as const, description: 'View session report.' },
  { moduleCode: 'report',       featureCode: 'iam',         actionCode: 'audit-trail', permissionCode: 'report.iam.audit-trail',      permissionType: 'Report' as const, description: 'View audit trail report.' },
  
  // CRM Dashboards & Reports
  { moduleCode: 'report',       featureCode: 'crm-dashboard', actionCode: 'view',    permissionCode: 'REPORTING_VIEW_CRM_DASHBOARD',     permissionType: 'Action' as const, description: 'View CRM dashboard.' },
  { moduleCode: 'report',       featureCode: 'counselor-metrics', actionCode: 'view', permissionCode: 'REPORTING_VIEW_COUNSELOR_METRICS', permissionType: 'Action' as const, description: 'View counselor performance metrics.' },
  { moduleCode: 'crm',          featureCode: 'leads',       actionCode: 'read.all_branch', permissionCode: 'LEAD_VIEW_ALL_IN_BRANCH', permissionType: 'Action' as const, description: 'View all leads in active branch.' },
];

async function seed() {
  console.log('🌱 Starting seed...');

  // 1. Clean up existing relations to prevent duplicate key errors in fresh seeds
  console.log('🧹 Cleaning old records...');
  await prisma.admission.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.leadStageHistory.deleteMany({});
  await prisma.leadFollowUp.deleteMany({});
  await prisma.leadNote.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.inquiry.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.batchTrainer.deleteMany({});
  await prisma.waitingList.deleteMany({});
  await prisma.batch.deleteMany({});
  await prisma.coursePricing.deleteMany({});
  await prisma.courseCompletionRule.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.courseCategory.deleteMany({});
  await prisma.passwordResetToken.deleteMany({});
  await prisma.loginHistory.deleteMany({});
  await prisma.userSession.deleteMany({});
  await prisma.userBranchAccess.deleteMany({});
  await prisma.userActivationToken.deleteMany({});
  await prisma.passwordHistory.deleteMany({});
  await prisma.securityPolicy.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.person.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.classroom.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.branch.deleteMany({});
  await prisma.institute.deleteMany({});

  // 2. Seed Permissions
  const permRecords = [];
  for (const perm of systemPermissions) {
    const record = await prisma.permission.create({
      data: {
        id: crypto.randomUUID(),
        ...perm,
        status: 'Active',
      },
    });
    permRecords.push(record);
    console.log(`  ✓ Permission created: ${perm.permissionCode}`);
  }

  // 3. Seed Roles
  const rolesToCreate = [
    { code: 'SUPER_ADMIN', name: 'Super Administrator', desc: 'Full unrestricted access to all IMS modules.' },
    { code: 'OWNER', name: 'Owner', desc: 'Global owner-level management and financial approvals.' },
    { code: 'BRANCH_MANAGER', name: 'Branch Manager', desc: 'Branch-level administrative and financial access.' },
    { code: 'COUNSELOR', name: 'Student Counselor', desc: 'Lead management, admissions, and student views.' },
    { code: 'TRAINER', name: 'Trainer', desc: 'Mark attendance, recommend completion, and view schedules.' },
    { code: 'ACCOUNTANT', name: 'Accountant', desc: 'Manage payments, issue receipts, and request refunds.' },
    { code: 'STUDENT', name: 'Student', desc: 'View fees, certificates, and attendance on portal.' },
    { code: 'ACADEMIC_COORDINATOR', name: 'Academic Coordinator', desc: 'Manage syllabus, courses, and exam evaluations.' },
    { code: 'MANAGEMENT', name: 'Management', desc: 'Global read-only access to audit logs and business analytics.' },
  ];

  const roleMap: Record<string, any> = {};
  for (const r of rolesToCreate) {
    const record = await prisma.role.create({
      data: {
        id: crypto.randomUUID(),
        roleCode: r.code,
        roleName: r.name,
        description: r.desc,
        status: 'Active',
        effectiveStartDate: new Date(),
      },
    });
    roleMap[r.code] = record;
    console.log(`  ✓ Role created: ${r.code}`);
  }

  // 4. Assign Permissions to Roles
  // Super Admin & Owner get all permissions
  for (const perm of permRecords) {
    await prisma.rolePermission.create({
      data: { roleId: roleMap['SUPER_ADMIN'].id, permissionId: perm.id },
    });
    await prisma.rolePermission.create({
      data: { roleId: roleMap['OWNER'].id, permissionId: perm.id },
    });
  }
  console.log(`  ✓ Assigned all permissions to SUPER_ADMIN & OWNER`);

  // Branch Manager gets branch-scoped management permissions
  const managerPermCodes = [
    'organization.branch.manage', 'organization.department.manage', 'organization.classroom.manage',
    'iam.user.read', 'iam.role.read', 'iam.session.read', 'iam.security-policy.read', 'iam.audit.read',
    'report.iam.user', 'report.iam.login-history', 'report.iam.security',
    'lead.read', 'lead.write', 'lead.create', 'lead.update', 'lead.delete', 'lead.assign', 'lead.lost', 'lead.reveal_pii', 'lead.qualify', 'lead.convert', 'crm.leads.read.all',
    'followup.create', 'followup.update',
    'student.read', 'student.write', 'enrollment.create',
    'payment.create', 'refund.request', 'course.manage', 'schedule.manage',
    'course.catalog.view', 'course.catalog.create', 'course.catalog.update', 'course.catalog.publish', 'course.catalog.archive',
    'batch.delivery.view',
    'batch.delivery.assign',
    'batch.delivery.create',
    'batch.delivery.update',
    'batch.delivery.transition',
    'attendance.record', 'result.record', 'certificate.generate',
    'certificate.verify', 'dashboard.branch', 'dashboard.security', 'dashboard.view',
    'REPORTING_VIEW_CRM_DASHBOARD', 'REPORTING_VIEW_COUNSELOR_METRICS', 'LEAD_VIEW_ALL_IN_BRANCH'
  ];
  const managerPerms = permRecords.filter(p => managerPermCodes.includes(p.permissionCode));
  for (const perm of managerPerms) {
    await prisma.rolePermission.create({
      data: { roleId: roleMap['BRANCH_MANAGER'].id, permissionId: perm.id },
    });
  }
  console.log(`  ✓ Assigned permissions to BRANCH_MANAGER`);

  // Counselor permissions
  const counselorPermCodes = [
    'iam.user.read',
    'lead.read', 'lead.write', 'lead.create', 'lead.update', 'lead.assign', 'lead.lost', 'lead.qualify', 'lead.convert',
    'followup.create', 'followup.update',
    'course.catalog.view',
    'batch.delivery.view',
    'student.read', 'dashboard.crm', 'report.iam.user', 'dashboard.view',
    'REPORTING_VIEW_CRM_DASHBOARD'
  ];
  const counselorPerms = permRecords.filter(p => counselorPermCodes.includes(p.permissionCode));
  for (const perm of counselorPerms) {
    await prisma.rolePermission.create({
      data: { roleId: roleMap['COUNSELOR'].id, permissionId: perm.id },
    });
  }
  console.log(`  ✓ Assigned permissions to COUNSELOR`);

  // Trainer permissions
  const trainerPermCodes = [
    'student.read', 'schedule.manage', 'attendance.record',
    'result.record', 'dashboard.training', 'batch.delivery.view'
  ];
  const trainerPerms = permRecords.filter(p => trainerPermCodes.includes(p.permissionCode));
  for (const perm of trainerPerms) {
    await prisma.rolePermission.create({
      data: { roleId: roleMap['TRAINER'].id, permissionId: perm.id },
    });
  }
  console.log(`  ✓ Assigned permissions to TRAINER`);

  // Accountant permissions
  const accountantPermCodes = [
    'student.read', 'payment.create', 'refund.request',
    'dashboard.finance', 'dashboard.view'
  ];
  const accountantPerms = permRecords.filter(p => accountantPermCodes.includes(p.permissionCode));
  for (const perm of accountantPerms) {
    await prisma.rolePermission.create({
      data: { roleId: roleMap['ACCOUNTANT'].id, permissionId: perm.id },
    });
  }
  console.log(`  ✓ Assigned permissions to ACCOUNTANT`);

  // Student permissions (mostly read-only dashboard)
  const studentPerms = permRecords.filter(p => ['certificate.verify'].includes(p.permissionCode));
  for (const perm of studentPerms) {
    await prisma.rolePermission.create({
      data: { roleId: roleMap['STUDENT'].id, permissionId: perm.id },
    });
  }
  console.log(`  ✓ Assigned permissions to STUDENT`);

  // 5. Seed Institute & Branches
  const institute = await prisma.institute.create({
    data: {
      id: crypto.randomUUID(),
      instituteCode: 'AST-HQ',
      instituteName: 'Al-Saud Training Institute',
      registrationNumber: 'REG-2024-001',
      primaryEmail: 'info@al-saud.edu.sa',
      primaryPhone: '+966-11-4567890',
      website: 'https://al-saud.edu.sa',
      address: 'King Fahd Road, Olaya',
      country: 'Saudi Arabia',
      status: 'Active',
    },
  });
  console.log(`  ✓ Institute created: Al-Saud Training Institute`);

  const riyadhBranch = await prisma.branch.create({
    data: {
      id: crypto.randomUUID(),
      instituteId: institute.id,
      branchCode: 'AST-RIYADH',
      branchName: 'Riyadh Main Campus',
      address: 'King Fahd Road, Olaya, Riyadh',
      city: 'Riyadh',
      country: 'Saudi Arabia',
      phone: '+966-11-4567890',
      email: 'riyadh@al-saud.edu.sa',
      status: 'Active',
      effectiveStartDate: new Date(),
    },
  });
  console.log(`  ✓ Branch created: Riyadh Main Campus (AST-RIYADH)`);

  const muscatBranch = await prisma.branch.create({
    data: {
      id: crypto.randomUUID(),
      instituteId: institute.id,
      branchCode: 'AST-MUSCAT',
      branchName: 'Muscat Campus',
      address: 'Al Khuwair, Muscat',
      city: 'Muscat',
      country: 'Oman',
      phone: '+968-24-123456',
      email: 'muscat@al-saud.edu.om',
      status: 'Active',
      effectiveStartDate: new Date(),
    },
  });
  console.log(`  ✓ Branch created: Muscat Campus (AST-MUSCAT)`);

  // Seed Riyadh Departments & Classrooms
  const riyadhItDept = await prisma.department.create({
    data: {
      id: crypto.randomUUID(),
      branchId: riyadhBranch.id,
      departmentCode: 'AST-RIYADH-IT',
      departmentName: 'Information Technology',
      description: 'IT and software development training department.',
      status: 'Active',
      effectiveStartDate: new Date(),
    },
  });
  console.log(`  ✓ Department created: Information Technology (AST-RIYADH-IT)`);

  const riyadhBizDept = await prisma.department.create({
    data: {
      id: crypto.randomUUID(),
      branchId: riyadhBranch.id,
      departmentCode: 'AST-RIYADH-BIZ',
      departmentName: 'Business Administration',
      description: 'Management and business training department.',
      status: 'Active',
      effectiveStartDate: new Date(),
    },
  });
  console.log(`  ✓ Department created: Business Administration (AST-RIYADH-BIZ)`);

  const riyadhLabA = await prisma.classroom.create({
    data: {
      id: crypto.randomUUID(),
      branchId: riyadhBranch.id,
      classroomName: 'Lab A',
      capacity: 25,
      location: '1st Floor, Building A',
      status: 'Active',
      effectiveStartDate: new Date(),
    },
  });
  console.log(`  ✓ Classroom created: Lab A (Riyadh)`);

  const riyadhLecture1 = await prisma.classroom.create({
    data: {
      id: crypto.randomUUID(),
      branchId: riyadhBranch.id,
      classroomName: 'Lecture Hall 1',
      capacity: 45,
      location: '2nd Floor, Building A',
      status: 'Active',
      effectiveStartDate: new Date(),
    },
  });
  console.log(`  ✓ Classroom created: Lecture Hall 1 (Riyadh)`);

  // Seed Muscat Departments & Classrooms
  const muscatEngDept = await prisma.department.create({
    data: {
      id: crypto.randomUUID(),
      branchId: muscatBranch.id,
      departmentCode: 'AST-MUSCAT-ENG',
      departmentName: 'English Training',
      description: 'Language training and IELTS preparation.',
      status: 'Active',
      effectiveStartDate: new Date(),
    },
  });
  console.log(`  ✓ Department created: English Training (AST-MUSCAT-ENG)`);

  const muscatRoom101 = await prisma.classroom.create({
    data: {
      id: crypto.randomUUID(),
      branchId: muscatBranch.id,
      classroomName: 'Room 101',
      capacity: 20,
      location: 'Ground Floor, Muscat Campus',
      status: 'Active',
      effectiveStartDate: new Date(),
    },
  });
  console.log(`  ✓ Classroom created: Room 101 (Muscat)`);

  // 6. Seed Users, Roles, and Branch Access
  const passwordHash = await argon2.hash('Password@123');

  await prisma.securityPolicy.create({
    data: {
      id: crypto.randomUUID(),
      maxFailedAttempts: 5,
      lockoutDurationMinutes: 30,
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireLowercase: true,
      passwordRequireNumbers: true,
      passwordRequireSpecial: true,
      passwordHistoryCount: 5,
      passwordExpiryDays: 90,
      resetTokenExpiryMinutes: 15,
      accessTokenExpiryMinutes: 15,
      refreshTokenExpiryDays: 7,
      rememberMeRefreshTokenDays: 30,
      sessionInactivityMinutes: 30,
      maxConcurrentSessions: 3,
    }
  });
  console.log('  ✓ Security Policy created');


  // User A: Super Admin (Global Scope)
  const superAdminPerson = await prisma.person.create({
    data: { id: crypto.randomUUID(), firstName: 'System', lastName: 'Administrator', mobile: '+966-500000001' }
  });
  const superAdminUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      personId: superAdminPerson.id,
      username: 'admin@ims.com',
      email: 'admin@ims.com',
      userType: 'Admin',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({ data: { userId: superAdminUser.id, roleId: roleMap['SUPER_ADMIN'].id } });
  console.log(`  ✓ User created: admin@ims.com (SUPER_ADMIN)`);

  const smokePerson = await prisma.person.create({
    data: { id: crypto.randomUUID(), firstName: 'Smoke', lastName: 'Admin', mobile: '+966-500000007' }
  });
  const smokeUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      personId: smokePerson.id,
      username: 'smoke.iam@ims.com',
      email: 'smoke.iam@ims.com',
      userType: 'Admin',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({ data: { userId: smokeUser.id, roleId: roleMap['SUPER_ADMIN'].id } });
  console.log(`  ✓ User created: smoke.iam@ims.com (SUPER_ADMIN smoke account)`);

  await prisma.user.update({
    where: { id: smokeUser.id },
    data: { defaultBranchId: riyadhBranch.id },
  });
  await prisma.userBranchAccess.create({
    data: { id: crypto.randomUUID(), userId: smokeUser.id, branchId: riyadhBranch.id, isDefault: true, status: 'Active' },
  });
  await prisma.userBranchAccess.create({
    data: { id: crypto.randomUUID(), userId: smokeUser.id, branchId: muscatBranch.id, isDefault: false, status: 'Active' },
  });
  console.log(`  ✓ Smoke user branch access created for AST-RIYADH and AST-MUSCAT`);

  // User B: Riyadh Branch Manager
  const riyadhManagerPerson = await prisma.person.create({
    data: { id: crypto.randomUUID(), firstName: 'Riyadh', lastName: 'Branch Manager', mobile: '+966-500000002' }
  });
  const riyadhManagerUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      personId: riyadhManagerPerson.id,
      username: 'manager.riyadh@ims.com',
      email: 'manager.riyadh@ims.com',
      userType: 'BranchManager',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({ data: { userId: riyadhManagerUser.id, roleId: roleMap['BRANCH_MANAGER'].id } });
  await prisma.userBranchAccess.create({
    data: { id: crypto.randomUUID(), userId: riyadhManagerUser.id, branchId: riyadhBranch.id, isDefault: true, status: 'Active' }
  });
  console.log(`  ✓ User created: manager.riyadh@ims.com (BRANCH_MANAGER, Branch AST-RIYADH)`);

  // User C: Riyadh Counselor
  const riyadhCounselorPerson = await prisma.person.create({
    data: { id: crypto.randomUUID(), firstName: 'Riyadh', lastName: 'Counselor', mobile: '+966-500000003' }
  });
  const riyadhCounselorUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      personId: riyadhCounselorPerson.id,
      username: 'counselor.riyadh@ims.com',
      email: 'counselor.riyadh@ims.com',
      userType: 'Counselor',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({ data: { userId: riyadhCounselorUser.id, roleId: roleMap['COUNSELOR'].id } });
  await prisma.userBranchAccess.create({
    data: { id: crypto.randomUUID(), userId: riyadhCounselorUser.id, branchId: riyadhBranch.id, isDefault: true, status: 'Active' }
  });
  console.log(`  ✓ User created: counselor.riyadh@ims.com (COUNSELOR, Branch AST-RIYADH)`);

  // User D: Riyadh Trainer
  const riyadhTrainerPerson = await prisma.person.create({
    data: { id: crypto.randomUUID(), firstName: 'Riyadh', lastName: 'Core Trainer', mobile: '+966-500000004' }
  });
  const riyadhTrainerUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      personId: riyadhTrainerPerson.id,
      username: 'trainer.riyadh@ims.com',
      email: 'trainer.riyadh@ims.com',
      userType: 'Trainer',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({ data: { userId: riyadhTrainerUser.id, roleId: roleMap['TRAINER'].id } });
  await prisma.userBranchAccess.create({
    data: { id: crypto.randomUUID(), userId: riyadhTrainerUser.id, branchId: riyadhBranch.id, isDefault: true, status: 'Active' }
  });
  console.log(`  ✓ User created: trainer.riyadh@ims.com (TRAINER, Branch AST-RIYADH)`);

  // User E: Riyadh Accountant
  const riyadhAccountantPerson = await prisma.person.create({
    data: { id: crypto.randomUUID(), firstName: 'Riyadh', lastName: 'Accountant User', mobile: '+966-500000005' }
  });
  const riyadhAccountantUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      personId: riyadhAccountantPerson.id,
      username: 'accountant.riyadh@ims.com',
      email: 'accountant.riyadh@ims.com',
      userType: 'Accountant',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({ data: { userId: riyadhAccountantUser.id, roleId: roleMap['ACCOUNTANT'].id } });
  await prisma.userBranchAccess.create({
    data: { id: crypto.randomUUID(), userId: riyadhAccountantUser.id, branchId: riyadhBranch.id, isDefault: true, status: 'Active' }
  });
  console.log(`  ✓ User created: accountant.riyadh@ims.com (ACCOUNTANT, Branch AST-RIYADH)`);

  // User F: Muscat Branch Manager
  const muscatManagerPerson = await prisma.person.create({
    data: { id: crypto.randomUUID(), firstName: 'Muscat', lastName: 'Branch Manager', mobile: '+966-500000006' }
  });
  const muscatManagerUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      personId: muscatManagerPerson.id,
      username: 'manager.muscat@ims.com',
      email: 'manager.muscat@ims.com',
      userType: 'BranchManager',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({ data: { userId: muscatManagerUser.id, roleId: roleMap['BRANCH_MANAGER'].id } });
  await prisma.userBranchAccess.create({
    data: { id: crypto.randomUUID(), userId: muscatManagerUser.id, branchId: muscatBranch.id, isDefault: true, status: 'Active' }
  });
  console.log(`  ✓ User created: manager.muscat@ims.com (BRANCH_MANAGER, Branch AST-MUSCAT)`);

  // 6. Create default active Courses
  const defaultCategoryCode = 'CAT-TECH';
  let techCategory = await prisma.courseCategory.findUnique({
    where: { code: defaultCategoryCode },
  });
  if (!techCategory) {
    techCategory = await prisma.courseCategory.create({
      data: {
        id: crypto.randomUUID(),
        code: defaultCategoryCode,
        nameEnglish: 'Technology & Engineering',
        nameArabic: 'التكنولوجيا والهندسة',
        description: 'Tech courses, software engineering, cyber security, data science',
        status: 'Active',
      },
    });
    console.log(`  ✓ Course Category seeded: ${techCategory.nameEnglish}`);
  }

  const defaultCourses = [
    { code: 'CS-FSWD', nameEnglish: 'Full Stack Web Development', nameArabic: 'تطوير تطبيقات الويب بالكامل' },
    { code: 'CS-MDEV', nameEnglish: 'Mobile App Development (iOS/Android)', nameArabic: 'تطوير تطبيقات الهاتف المحمول' },
    { code: 'CS-CSEC', nameEnglish: 'Advanced Cyber Security & Ethical Hacking', nameArabic: 'الأمن السيبراني المتقدم والاختراق الأخلاقي' },
    { code: 'CS-DSAI', nameEnglish: 'Data Science and Artificial Intelligence', nameArabic: 'علم البيانات والذكاء الاصطناعي' },
    { code: 'CS-CLAW', nameEnglish: 'Cloud Solutions Architecture (AWS/Azure)', nameArabic: 'هندسة حلول السحابة' },
    { code: 'CS-UIUX', nameEnglish: 'UI/UX Design & Product Strategy', nameArabic: 'تصميم واجهة وتجربة المستخدم' },
  ];

  for (const c of defaultCourses) {
    const existing = await prisma.course.findUnique({
      where: { courseCode: c.code },
    });
    if (!existing) {
      const newCourse = await prisma.course.create({
        data: {
          id: crypto.randomUUID(),
          courseCode: c.code,
          nameEnglish: c.nameEnglish,
          nameArabic: c.nameArabic,
          descriptionEnglish: `${c.nameEnglish} course template.`,
          descriptionArabic: `دورة ${c.nameEnglish}.`,
          departmentId: riyadhItDept.id,
          categoryId: techCategory.id,
          courseClassification: 'Regular',
          durationType: 'Weeks',
          durationValue: 12,
          allowWalkInCompletion: false,
          status: 'Published',
          effectiveStartDate: new Date(),
        },
      });

      // Seed default pricing and completion rules to satisfy constraints
      await prisma.coursePricing.create({
        data: {
          id: crypto.randomUUID(),
          courseId: newCourse.id,
          customerType: 'Individual',
          batchType: 'Regular',
          basePrice: 500.000,
          effectiveStartDate: new Date(),
          status: 'Active',
        },
      });
      await prisma.courseCompletionRule.create({
        data: {
          id: crypto.randomUUID(),
          courseId: newCourse.id,
          minimumAttendancePercent: 80,
          effectiveStartDate: new Date(),
          status: 'Active',
        },
      });

      console.log(`  ✓ Course seeded: ${c.nameEnglish}`);
    }
  }

  console.log('\n🌱 Seed script complete! Database seeded successfully.');

}

seed()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
