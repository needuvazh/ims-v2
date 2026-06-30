const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      isDeleted: true,
      status: true,
      person: {
        select: {
          firstName: true,
          lastName: true,
        }
      }
    }
  });
  console.log('--- ALL USERS IN DB ---');
  console.log(JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
