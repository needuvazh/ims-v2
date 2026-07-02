import { Prisma, PrismaClient } from '@prisma/client';
import { IDocumentsService, DocumentCaptureInput, OwnerType, DocumentType } from '../domain/document';

export class DocumentsService implements IDocumentsService {
  constructor(private readonly prisma: PrismaClient) {}

  async registerDocuments(
    ownerId: string,
    ownerType: OwnerType,
    branchId: string,
    inputs: DocumentCaptureInput[],
    tx: Prisma.TransactionClient,
    actorId?: string
  ): Promise<void> {
    const client = tx || this.prisma;

    for (const input of inputs) {
      // 1. Create Document
      const document = await client.document.create({
        data: {
          fileKey: input.fileKey,
          fileName: input.fileName,
          fileType: input.fileType,
          documentType: input.documentType as any,
          branchId: branchId,
          status: 'Active',
          createdBy: actorId || null,
        },
      });

      // 2. Create DocumentOwner mapping
      await client.documentOwner.create({
        data: {
          documentId: document.id,
          ownerId: ownerId,
          ownerType: ownerType as any,
          createdBy: actorId || null,
        },
      });

      // 3. Create initial pending DocumentVerification record
      await client.documentVerification.create({
        data: {
          documentId: document.id,
          outcome: 'Pending',
          createdBy: actorId || null,
        },
      });
    }
  }

  async verifyDocumentAccess(
    userId: string,
    documentId: string,
    tx?: Prisma.TransactionClient
  ): Promise<boolean> {
    const client = tx || this.prisma;

    const document = await client.document.findUnique({
      where: { id: documentId },
      select: { branchId: true },
    });

    if (!document) {
      return false;
    }

    const access = await client.userBranchAccess.findFirst({
      where: {
        userId,
        branchId: document.branchId,
      },
    });

    return !!access;
  }

  async verifyBranchAccess(
    userId: string,
    branchId: string,
    tx?: Prisma.TransactionClient
  ): Promise<boolean> {
    const client = tx || this.prisma;

    const access = await client.userBranchAccess.findFirst({
      where: {
        userId,
        branchId,
      },
    });

    return !!access;
  }

  async getDocumentsByOwner(
    ownerId: string,
    ownerType: OwnerType,
    tx?: Prisma.TransactionClient
  ): Promise<any[]> {
    const client = tx || this.prisma;

    return client.document.findMany({
      where: {
        owners: {
          some: {
            ownerId,
            ownerType: ownerType as any,
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
  }

  async getDocumentsByOwners(
    ownerRefs: { ownerId: string; ownerType: OwnerType }[],
    tx?: Prisma.TransactionClient
  ): Promise<any[]> {
    const client = tx || this.prisma;

    if (ownerRefs.length === 0) {
      return [];
    }

    return client.document.findMany({
      where: {
        owners: {
          some: {
            OR: ownerRefs.map((ref) => ({
              ownerId: ref.ownerId,
              ownerType: ref.ownerType as any,
            })),
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
  }
}
