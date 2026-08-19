import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const permissions = [
  {
    moduleCode: 'corporate-training',
    featureCode: 'accounts',
    actionCode: 'read',
    permissionCode: 'corporate-training.accounts.read',
    permissionType: 'Action' as const,
    description: 'View B2B corporate training cockpit and account profiles.',
  },
  {
    moduleCode: 'corporate-training',
    featureCode: 'accounts',
    actionCode: 'write',
    permissionCode: 'corporate-training.accounts.write',
    permissionType: 'Action' as const,
    description: 'Create and edit B2B corporate training accounts.',
  },
  {
    moduleCode: 'corporate-training',
    featureCode: 'billing',
    actionCode: 'write',
    permissionCode: 'corporate-training.billing.write',
    permissionType: 'Action' as const,
    description: 'Request B2B invoicing milestones for enrollments.',
  },
  {
    moduleCode: 'corporate-training',
    featureCode: 'billing',
    actionCode: 'read',
    permissionCode: 'corporate-training.billing.read',
    permissionType: 'Action' as const,
    description: 'View B2B invoices and outstanding collections.',
  },
];

async function main() {
  console.log("🌱 Upserting B2B corporate training permissions...");

  const superAdminRole = await prisma.role.findFirst({ where: { roleCode: 'SUPER_ADMIN' } });
  const ownerRole = await prisma.role.findFirst({ where: { roleCode: 'OWNER' } });
  const managerRole = await prisma.role.findFirst({ where: { roleCode: 'BRANCH_MANAGER' } });
  const counselorRole = await prisma.role.findFirst({ where: { roleCode: 'COUNSELOR' } });
  const accountantRole = await prisma.role.findFirst({ where: { roleCode: 'ACCOUNTANT' } });

  for (const perm of permissions) {
    const record = await prisma.permission.upsert({
      where: { permissionCode: perm.permissionCode },
      update: {
        description: perm.description,
        moduleCode: perm.moduleCode,
        featureCode: perm.featureCode,
        actionCode: perm.actionCode,
      },
      create: {
        moduleCode: perm.moduleCode,
        featureCode: perm.featureCode,
        actionCode: perm.actionCode,
        permissionCode: perm.permissionCode,
        permissionType: perm.permissionType,
        description: perm.description,
        status: 'Active',
      },
    });

    console.log(`✓ Upserted Permission: ${perm.permissionCode}`);

    // Assign to roles
    const rolesToAssign = [];
    if (superAdminRole) rolesToAssign.push(superAdminRole);
    if (ownerRole) rolesToAssign.push(ownerRole);
    
    if (managerRole) {
      rolesToAssign.push(managerRole);
    }
    if (counselorRole && (perm.permissionCode.includes('accounts.read') || perm.permissionCode.includes('accounts.write'))) {
      rolesToAssign.push(counselorRole);
    }
    if (accountantRole && (perm.permissionCode.includes('accounts.read') || perm.permissionCode.includes('billing.write') || perm.permissionCode.includes('billing.read'))) {
      rolesToAssign.push(accountantRole);
    }

    for (const role of rolesToAssign) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: record.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: record.id,
        },
      });
      console.log(`  └─ Assigned to role: ${role.roleCode}`);
    }
  }

  console.log("🎉 Successfully seeded corporate training permissions!");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
