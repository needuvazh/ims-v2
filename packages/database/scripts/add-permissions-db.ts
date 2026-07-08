import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const newPerms = [
    {
      moduleCode: 'scheduling',
      featureCode: 'conflict',
      actionCode: 'read',
      permissionCode: 'scheduling.conflict.read',
      description: 'View scheduling conflicts.',
    },
    {
      moduleCode: 'scheduling',
      featureCode: 'holiday',
      actionCode: 'create',
      permissionCode: 'scheduling.holiday.create',
      description: 'Create holidays.',
    },
  ];

  const adminRoles = ['SUPER_ADMIN', 'OWNER'];

  for (const item of newPerms) {
    // 1. Create permission if not exists
    let perm = await prisma.permission.findUnique({
      where: { permissionCode: item.permissionCode },
    });

    if (!perm) {
      perm = await prisma.permission.create({
        data: {
          moduleCode: item.moduleCode,
          featureCode: item.featureCode,
          actionCode: item.actionCode,
          permissionCode: item.permissionCode,
          description: item.description,
          status: 'Active',
        },
      });
      console.log(`Created permission: ${item.permissionCode}`);
    } else {
      console.log(`Permission already exists: ${item.permissionCode}`);
    }

    // 2. Link to SUPER_ADMIN & OWNER roles
    for (const code of adminRoles) {
      const role = await prisma.role.findFirst({
        where: { roleCode: code },
      });

      if (role) {
        const link = await prisma.rolePermission.findFirst({
          where: { roleId: role.id, permissionId: perm.id },
        });

        if (!link) {
          await prisma.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: perm.id,
            },
          });
          console.log(`Assigned ${item.permissionCode} to ${code}`);
        } else {
          console.log(`${item.permissionCode} already assigned to ${code}`);
        }
      } else {
        console.log(`Role ${code} not found`);
      }
    }
  }

  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
