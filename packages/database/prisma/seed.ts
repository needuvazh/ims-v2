/**
 * Prisma Seed Script — IMS v2
 * Run: pnpm --filter @ims/database exec ts-node prisma/seed.ts
 * Or:  DATABASE_URL="..." pnpm prisma db seed --schema=packages/database/prisma/schema.prisma
 *
 * Seeds:
 *  1. System permissions (8 built-in)
 *  2. SuperAdmin role with all permissions
 *  3. One SuperAdmin user: admin@ims.com / Admin@123456
 *  4. One Institute: Al-Saud Training Institute
 *  5. One Branch: Main Campus
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const systemPermissions = [
  { moduleCode: 'organization', featureCode: 'institute',   actionCode: 'manage', permissionCode: 'organization.manage',            description: 'Manage institutes and branches.' },
  { moduleCode: 'organization', featureCode: 'branch',      actionCode: 'manage', permissionCode: 'organization.branch.manage',     description: 'Create and update branches.' },
  { moduleCode: 'organization', featureCode: 'department',  actionCode: 'manage', permissionCode: 'organization.department.manage', description: 'Manage departments.' },
  { moduleCode: 'identity',     featureCode: 'user',        actionCode: 'read',   permissionCode: 'identity.read',                  description: 'View users and roles.' },
  { moduleCode: 'identity',     featureCode: 'user',        actionCode: 'write',  permissionCode: 'identity.write',                 description: 'Create and update users.' },
  { moduleCode: 'identity',     featureCode: 'role',        actionCode: 'manage', permissionCode: 'identity.role.manage',           description: 'Manage roles and permissions.' },
  { moduleCode: 'dashboard',    featureCode: 'summary',     actionCode: 'view',   permissionCode: 'dashboard.view',                 description: 'View dashboard summary.' },
  { moduleCode: 'certificate',  featureCode: 'public',      actionCode: 'verify', permissionCode: 'certificate.verify',             description: 'Verify public certificates.' },
];

async function seed() {
  console.log('🌱 Starting seed...');

  // 1. Upsert permissions
  const permRecords = [];
  for (const perm of systemPermissions) {
    const record = await prisma.permission.upsert({
      where: { permissionCode: perm.permissionCode },
      create: { id: generateId(), ...perm, status: 'Active' },
      update: { description: perm.description },
    });
    permRecords.push(record);
    console.log(`  ✓ Permission: ${perm.permissionCode}`);
  }

  // 2. Upsert SuperAdmin role
  const superAdminRole = await prisma.role.upsert({
    where: { roleCode: 'SUPER_ADMIN' },
    create: {
      id: generateId(),
      roleCode: 'SUPER_ADMIN',
      roleName: 'Super Administrator',
      description: 'Full unrestricted access to all IMS modules.',
      status: 'Active',
    },
    update: { roleName: 'Super Administrator', status: 'Active' },
  });
  console.log(`  ✓ Role: ${superAdminRole.roleCode}`);

  // 3. Assign all permissions to SuperAdmin
  for (const perm of permRecords) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id } },
      create: { roleId: superAdminRole.id, permissionId: perm.id, createdBy: 'seed' },
      update: {},
    });
  }
  console.log(`  ✓ Assigned ${permRecords.length} permissions to SUPER_ADMIN`);

  // 4. Upsert admin user
  const passwordHash = await bcrypt.hash('Admin@123456', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@ims.com' },
    create: {
      id: generateId(),
      fullName: 'System Administrator',
      email: 'admin@ims.com',
      phone: null,
      userType: 'SuperAdmin',
      status: 'Active',
      passwordHash,
    },
    update: { fullName: 'System Administrator', status: 'Active' },
  });
  console.log(`  ✓ User: ${adminUser.email}`);

  // 5. Assign SuperAdmin role to admin user
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: superAdminRole.id } },
    create: { userId: adminUser.id, roleId: superAdminRole.id, createdBy: 'seed' },
    update: {},
  });
  console.log(`  ✓ Assigned SUPER_ADMIN role to admin@ims.com`);

  // 6. Upsert Institute
  const institute = await prisma.institute.upsert({
    where: { instituteCode: 'AST-HQ' },
    create: {
      id: generateId(),
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
    update: { instituteName: 'Al-Saud Training Institute', status: 'Active' },
  });
  console.log(`  ✓ Institute: ${institute.instituteCode}`);

  // 7. Upsert Branch
  const branch = await prisma.branch.upsert({
    where: { branchCode: 'AST-RIYADH' },
    create: {
      id: generateId(),
      instituteId: institute.id,
      branchCode: 'AST-RIYADH',
      branchName: 'Riyadh Main Campus',
      address: 'King Fahd Road, Olaya, Riyadh',
      city: 'Riyadh',
      country: 'Saudi Arabia',
      phone: '+966-11-4567890',
      email: 'riyadh@al-saud.edu.sa',
      status: 'Active',
    },
    update: { branchName: 'Riyadh Main Campus', status: 'Active' },
  });
  console.log(`  ✓ Branch: ${branch.branchCode}`);

  console.log('\n✅ Seed complete!');
  console.log('\n📋 Admin credentials:');
  console.log('   Email:    admin@ims.com');
  console.log('   Password: Admin@123456');
}

function generateId(): string {
  return crypto.randomUUID();
}

seed()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
