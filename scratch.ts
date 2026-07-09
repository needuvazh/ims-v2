import { PrismaClient } from '@prisma/client';
import { PrismaTrainerManagementRepository } from './packages/trainer-management/src/infrastructure/prisma-trainer-management-repository';

const prisma = new PrismaClient();
const repository = new PrismaTrainerManagementRepository(prisma);

async function main() {
  const input = {
    courseId: '2f2f0a49-a64e-4cd9-96e1-92ec50193010',
    branchId: '72f3f2ba-c38b-43f6-a0e8-c5104672d56d',
    targetDate: new Date('2026-07-08'),
    startTime: '10:43',
    endTime: '12:44',
  };

  console.log('=== Running findEligibleTrainers with targetDate: 2026-07-08 ===');
  console.log('Input:', input);

  const result = await repository.findEligibleTrainers(input, { page: 1, pageSize: 20 });
  console.log('\n=== RESULTS ===');
  console.log(JSON.stringify(result, null, 2));

  // Let's also print the date representation in JS
  const dateObj = new Date('2026-07-08');
  console.log('\n=== Date Object properties ===');
  console.log('dateObj.toISOString():', dateObj.toISOString());
  console.log('dateObj.getDay() (local):', dateObj.getDay());
  console.log('dateObj.getUTCDay() (UTC):', dateObj.getUTCDay());
  console.log('Day string resolved by repository:', [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ][dateObj.getDay()]);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
