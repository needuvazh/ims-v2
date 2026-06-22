import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const systemPermissions = [
  // Organization Management
  { moduleCode: 'organization', featureCode: 'institute',   actionCode: 'manage', permissionCode: 'organization.manage',            permissionType: 'Action' as const, description: 'Manage institutes and branches.' },
  { moduleCode: 'organization', featureCode: 'branch',      actionCode: 'manage', permissionCode: 'organization.branch.manage',     permissionType: 'Action' as const, description: 'Create and update branches.' },
  { moduleCode: 'organization', featureCode: 'department',  actionCode: 'manage', permissionCode: 'organization.department.manage', permissionType: 'Action' as const, description: 'Manage departments.' },
  
  // Identity & Access (RBAC)
  { moduleCode: 'identity',     featureCode: 'user',        actionCode: 'read',   permissionCode: 'identity.read',                  permissionType: 'Action' as const, description: 'View users and roles.' },
  { moduleCode: 'identity',     featureCode: 'user',        actionCode: 'write',  permissionCode: 'identity.write',                 permissionType: 'Action' as const, description: 'Create and update users.' },
  { moduleCode: 'identity',     featureCode: 'role',        actionCode: 'manage', permissionCode: 'identity.role.manage',           permissionType: 'Action' as const, description: 'Manage roles and permissions.' },
  
  // CRM / Leads Management
  { moduleCode: 'crm',          featureCode: 'leads',       actionCode: 'read',   permissionCode: 'lead.read',                      permissionType: 'Action' as const, description: 'View leads.' },
  { moduleCode: 'crm',          featureCode: 'leads',       actionCode: 'write',  permissionCode: 'lead.write',                     permissionType: 'Action' as const, description: 'Create and update leads.' },
  { moduleCode: 'crm',          featureCode: 'leads',       actionCode: 'convert',permissionCode: 'lead.convert',                   permissionType: 'Action' as const, description: 'Convert leads to admissions.' },
  
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
  { moduleCode: 'scheduling',   featureCode: 'sessions',    actionCode: 'manage', permissionCode: 'schedule.manage',                permissionType: 'Action' as const, description: 'Create and update schedules.' },
  
  // Attendance & Completion
  { moduleCode: 'attendance',   featureCode: 'records',     actionCode: 'write',  permissionCode: 'attendance.record',              permissionType: 'Action' as const, description: 'Mark student attendance.' },
  { moduleCode: 'exams',        featureCode: 'results',     actionCode: 'write',  permissionCode: 'result.record',                  permissionType: 'Action' as const, description: 'Enter exam marks and grades.' },
  
  // Certificates
  { moduleCode: 'certificate',  featureCode: 'issue',       actionCode: 'write',  permissionCode: 'certificate.generate',           permissionType: 'Action' as const, description: 'Generate and issue certificates.' },
  { moduleCode: 'certificate',  featureCode: 'public',      actionCode: 'verify', permissionCode: 'certificate.verify',             permissionType: 'Action' as const, description: 'Verify certificates publicly.' },
  
  // Dashboard & Audit
  { moduleCode: 'dashboard',    featureCode: 'summary',     actionCode: 'view',   permissionCode: 'dashboard.view',                 permissionType: 'Action' as const, description: 'View dashboard metrics.' },
  { moduleCode: 'audit',        featureCode: 'logs',        actionCode: 'read',   permissionCode: 'audit.view',                     permissionType: 'Action' as const, description: 'View security audit logs.' },
];

async function seed() {
  console.log('🌱 Starting seed...');

  // 1. Clean up existing relations to prevent duplicate key errors in fresh seeds
  console.log('🧹 Cleaning old records...');
  await prisma.loginHistory.deleteMany({});
  await prisma.userSession.deleteMany({});
  await prisma.userDataScope.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.permission.deleteMany({});
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
    'organization.branch.manage', 'organization.department.manage',
    'identity.read', 'lead.read', 'lead.write', 'lead.convert',
    'student.read', 'student.write', 'enrollment.create',
    'payment.create', 'refund.request', 'course.manage', 'schedule.manage',
    'attendance.record', 'result.record', 'certificate.generate',
    'certificate.verify', 'dashboard.view', 'audit.view'
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
    'identity.read', 'lead.read', 'lead.write', 'lead.convert',
    'student.read', 'dashboard.view'
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
    'result.record', 'dashboard.view'
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
    'dashboard.view'
  ];
  const accountantPerms = permRecords.filter(p => accountantPermCodes.includes(p.permissionCode));
  for (const perm of accountantPerms) {
    await prisma.rolePermission.create({
      data: { roleId: roleMap['ACCOUNTANT'].id, permissionId: perm.id },
    });
  }
  console.log(`  ✓ Assigned permissions to ACCOUNTANT`);

  // Student permissions (mostly read-only dashboard)
  const studentPerms = permRecords.filter(p => ['dashboard.view', 'certificate.verify'].includes(p.permissionCode));
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

  // 6. Seed Users, Roles, and Data Scopes
  const passwordHash = await bcrypt.hash('Password@123', 12);

  // User A: Super Admin (Global Scope)
  const superAdminUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      fullName: 'System Administrator',
      email: 'admin@ims.com',
      userType: 'Admin',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({
    data: { userId: superAdminUser.id, roleId: roleMap['SUPER_ADMIN'].id }
  });
  await prisma.userDataScope.create({
    data: {
      id: crypto.randomUUID(),
      userId: superAdminUser.id,
      scopeType: 'All',
    }
  });
  console.log(`  ✓ User created: admin@ims.com (SUPER_ADMIN, Scope: All)`);

  // User B: Riyadh Branch Manager (Branch AST-RIYADH, full branch access)
  const riyadhManagerUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      fullName: 'Riyadh Branch Manager',
      email: 'manager.riyadh@ims.com',
      userType: 'Branch Manager',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({
    data: { userId: riyadhManagerUser.id, roleId: roleMap['BRANCH_MANAGER'].id }
  });
  await prisma.userDataScope.create({
    data: {
      id: crypto.randomUUID(),
      userId: riyadhManagerUser.id,
      scopeType: 'Branch',
      branchId: riyadhBranch.id,
      assignedOnly: false,
    }
  });
  console.log(`  ✓ User created: manager.riyadh@ims.com (BRANCH_MANAGER, Scope: Branch AST-RIYADH)`);

  // User C: Riyadh Counselor (Branch AST-RIYADH, assigned only access)
  const riyadhCounselorUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      fullName: 'Riyadh Counselor User',
      email: 'counselor.riyadh@ims.com',
      userType: 'Counselor',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({
    data: { userId: riyadhCounselorUser.id, roleId: roleMap['COUNSELOR'].id }
  });
  await prisma.userDataScope.create({
    data: {
      id: crypto.randomUUID(),
      userId: riyadhCounselorUser.id,
      scopeType: 'Branch',
      branchId: riyadhBranch.id,
      assignedOnly: true,
    }
  });
  console.log(`  ✓ User created: counselor.riyadh@ims.com (COUNSELOR, Scope: Branch AST-RIYADH, Assigned Only)`);

  // User D: Riyadh Trainer (Branch AST-RIYADH, assigned only access)
  const riyadhTrainerUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      fullName: 'Riyadh Core Trainer',
      email: 'trainer.riyadh@ims.com',
      userType: 'Trainer',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({
    data: { userId: riyadhTrainerUser.id, roleId: roleMap['TRAINER'].id }
  });
  await prisma.userDataScope.create({
    data: {
      id: crypto.randomUUID(),
      userId: riyadhTrainerUser.id,
      scopeType: 'Branch',
      branchId: riyadhBranch.id,
      assignedOnly: true,
    }
  });
  console.log(`  ✓ User created: trainer.riyadh@ims.com (TRAINER, Scope: Branch AST-RIYADH, Assigned Only)`);

  // User E: Riyadh Accountant (Branch AST-RIYADH, full branch finance access)
  const riyadhAccountantUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      fullName: 'Riyadh Accountant User',
      email: 'accountant.riyadh@ims.com',
      userType: 'Accountant',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({
    data: { userId: riyadhAccountantUser.id, roleId: roleMap['ACCOUNTANT'].id }
  });
  await prisma.userDataScope.create({
    data: {
      id: crypto.randomUUID(),
      userId: riyadhAccountantUser.id,
      scopeType: 'Branch',
      branchId: riyadhBranch.id,
      assignedOnly: false,
    }
  });
  console.log(`  ✓ User created: accountant.riyadh@ims.com (ACCOUNTANT, Scope: Branch AST-RIYADH)`);

  // User F: Muscat Branch Manager (Branch AST-MUSCAT, full branch access)
  const muscatManagerUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      fullName: 'Muscat Branch Manager',
      email: 'manager.muscat@ims.com',
      userType: 'Branch Manager',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({
    data: { userId: muscatManagerUser.id, roleId: roleMap['BRANCH_MANAGER'].id }
  });
  await prisma.userDataScope.create({
    data: {
      id: crypto.randomUUID(),
      userId: muscatManagerUser.id,
      scopeType: 'Branch',
      branchId: muscatBranch.id,
      assignedOnly: false,
    }
  });
  console.log(`  ✓ User created: manager.muscat@ims.com (BRANCH_MANAGER, Scope: Branch AST-MUSCAT)`);

  console.log('\n🌱 Seed script complete! Database seeded successfully.');
}

seed()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
