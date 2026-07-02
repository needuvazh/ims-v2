import { expect, test, vi } from 'vitest';
import { DocumentsService } from './documents-service';

test('DocumentsService.registerDocuments should create Document, Owner, and Verification records', async () => {
  const mockPrisma = {
    document: {
      create: vi.fn().mockResolvedValue({ id: 'doc-uuid-1' }),
    },
    documentOwner: {
      create: vi.fn().mockResolvedValue({ id: 'owner-uuid-1' }),
    },
    documentVerification: {
      create: vi.fn().mockResolvedValue({ id: 'ver-uuid-1' }),
    },
  } as any;

  const service = new DocumentsService(mockPrisma);

  const inputs = [
    {
      fileName: 'test.pdf',
      fileKey: 'uploads/test.pdf',
      fileType: 'application/pdf',
      documentType: 'CIVIL_ID_FRONT' as any,
    },
  ];

  await service.registerDocuments('person-1', 'Person', 'branch-1', inputs, mockPrisma, 'actor-1');

  expect(mockPrisma.document.create).toHaveBeenCalledWith({
    data: {
      fileKey: 'uploads/test.pdf',
      fileName: 'test.pdf',
      fileType: 'application/pdf',
      documentType: 'CIVIL_ID_FRONT',
      branchId: 'branch-1',
      status: 'Active',
      createdBy: 'actor-1',
    },
  });

  expect(mockPrisma.documentOwner.create).toHaveBeenCalledWith({
    data: {
      documentId: 'doc-uuid-1',
      ownerId: 'person-1',
      ownerType: 'Person',
      createdBy: 'actor-1',
    },
  });

  expect(mockPrisma.documentVerification.create).toHaveBeenCalledWith({
    data: {
      documentId: 'doc-uuid-1',
      outcome: 'Pending',
      createdBy: 'actor-1',
    },
  });
});

test('DocumentsService.verifyDocumentAccess should authorize if user has branch access and deny otherwise', async () => {
  const mockPrisma = {
    document: {
      findUnique: vi.fn().mockImplementation(({ where }) => {
        if (where.id === 'doc-valid') {
          return Promise.resolve({ branchId: 'branch-allowed' });
        }
        return Promise.resolve({ branchId: 'branch-denied' });
      }),
    },
    userBranchAccess: {
      findFirst: vi.fn().mockImplementation(({ where }) => {
        if (where.userId === 'user-1' && where.branchId === 'branch-allowed') {
          return Promise.resolve({ id: 'access-1' });
        }
        return Promise.resolve(null);
      }),
    },
  } as any;

  const service = new DocumentsService(mockPrisma);

  // 1. Authorized access
  const allowed = await service.verifyDocumentAccess('user-1', 'doc-valid', mockPrisma);
  expect(allowed).toBe(true);

  // 2. Unauthorized access
  const denied = await service.verifyDocumentAccess('user-1', 'doc-invalid', mockPrisma);
  expect(denied).toBe(false);
});

test('DocumentsService.getDocumentsByOwner should return document list with latest verification', async () => {
  const mockPrisma = {
    document: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'doc-1',
          fileName: 'passport.pdf',
          documentType: 'PASSPORT_SCAN',
          status: 'Active',
          verifications: [
            { id: 'ver-1', outcome: 'Verified' },
          ],
        },
      ]),
    },
  } as any;

  const service = new DocumentsService(mockPrisma);

  const docs = await service.getDocumentsByOwner('person-1', 'Person', mockPrisma);

  expect(docs).toHaveLength(1);
  expect(docs[0].documentType).toBe('PASSPORT_SCAN');
  expect(docs[0].verifications[0].outcome).toBe('Verified');
  expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
    where: {
      owners: {
        some: {
          ownerId: 'person-1',
          ownerType: 'Person',
        },
      },
      isDeleted: false,
    },
    include: {
      verifications: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
});

test('DocumentsService.getDocumentsByOwners should return document list for multiple owners', async () => {
  const mockPrisma = {
    document: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'doc-1',
          fileName: 'passport.pdf',
          documentType: 'PASSPORT_SCAN',
          status: 'Active',
          verifications: [{ id: 'ver-1', outcome: 'Verified' }],
        },
      ]),
    },
  } as any;

  const service = new DocumentsService(mockPrisma);

  const owners: { ownerId: string; ownerType: any }[] = [
    { ownerId: 'person-1', ownerType: 'Person' },
    { ownerId: 'profile-1', ownerType: 'StudentProfile' },
  ];

  const docs = await service.getDocumentsByOwners(owners, mockPrisma);

  expect(docs).toHaveLength(1);
  expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
    where: {
      owners: {
        some: {
          OR: [
            { ownerId: 'person-1', ownerType: 'Person' },
            { ownerId: 'profile-1', ownerType: 'StudentProfile' },
          ],
        },
      },
      isDeleted: false,
    },
    include: {
      verifications: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
});
