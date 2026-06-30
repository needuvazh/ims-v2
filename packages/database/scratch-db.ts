import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const permAssign = await prisma.permission.findFirst({
      where: {
        permissionCode: {
          in: ['iam.role.permission.assign', 'iam.permission.assign']
        }
      }
    });
    console.log('Permission found:', permAssign);

    const roles = await prisma.role.findMany({
      where: {
        roleCode: 'SUPER_ADMIN'
      },
      include: {
        roles: {
          include: {
            permission: true
          }
        }
      }
    });
    console.log('SUPER_ADMIN Roles:', JSON.stringify(roles, null, 2));
  } catch (error: any) {
    console.error('An error occurred during DB operation:');
    console.error(error);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}
main().catch((err) => {
  console.error('Outer error:', err);
}).finally(() => prisma.$disconnect());


