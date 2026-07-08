import { expect, test, vi } from 'vitest';
import { AdmissionRepository } from './admission-repository';

test('AdmissionRepository should exclude soft-deleted persons from duplicate lookup', async () => {
  const findFirstMock = vi.fn().mockResolvedValue(null);
  const prisma = {
    person: { findFirst: findFirstMock },
    studentProfile: { findFirst: vi.fn() },
  } as any;

  const repository = new AdmissionRepository(prisma);

  await repository.findPersonByUniqueKeys(
    null,
    null,
    'NID-123',
  );
 
   expect(findFirstMock).toHaveBeenCalledWith({
     where: {
       nationalId: 'NID-123',
       isDeleted: false,
     },
   });
});

test('AdmissionRepository should exclude soft-deleted student profiles when reusing by person', async () => {
  const findFirstMock = vi.fn().mockResolvedValue(null);
  const prisma = {
    person: { findFirst: vi.fn() },
    studentProfile: { findFirst: findFirstMock },
  } as any;

  const repository = new AdmissionRepository(prisma);

  await repository.findStudentProfileByPersonId('person-1');

  expect(findFirstMock).toHaveBeenCalledWith({
    where: {
      personId: 'person-1',
      isDeleted: false,
    },
  });
});
