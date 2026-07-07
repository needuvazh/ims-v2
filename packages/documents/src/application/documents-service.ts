import { Prisma, PrismaClient, VerificationOutcome } from '@prisma/client';
import { IDocumentsService, type DocumentCaptureInput, type DocumentWithLatestVerification, type OwnerType } from '../domain/document';
import { type StorageProvider, type OwnerResolver } from '../domain/ports';

export class DocumentsService implements IDocumentsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly storageProvider?: StorageProvider,
    private readonly ownerResolver?: OwnerResolver
  ) {}

  async generateUploadUrl(
    fileName: string,
    mimeType: string
  ): Promise<{ url: string; fileKey: string }> {
    if (!this.storageProvider) {
      throw new Error('STORAGE_PROVIDER_NOT_CONFIGURED');
    }
    return this.storageProvider.generateUploadUrl(fileName, mimeType);
  }

  async registerDocuments(
    ownerId: string,
    ownerType: OwnerType,
    branchId: string,
    inputs: DocumentCaptureInput[],
    tx: Prisma.TransactionClient,
    actorId?: string
  ): Promise<void> {
    const client = tx || this.prisma;

    if (this.ownerResolver) {
      const exists = await this.ownerResolver.validateOwnerExists(ownerId, ownerType);
      if (!exists) {
        throw new Error('DOC_OWNER_NOT_FOUND');
      }
      const ownerBranch = await this.ownerResolver.resolveOwnerBranch(ownerId, ownerType);
      if (ownerBranch !== branchId) {
        throw new Error('DOC_BRANCH_MISMATCH');
      }
    }

    for (const input of inputs) {
      // 1. Create Document
      const document = await client.document.create({
        data: {
          fileKey: input.fileKey,
          fileName: input.fileName,
          fileType: input.fileType,
          documentType: input.documentType,
          branchId: branchId,
          status: 'Active',
          issueDate: input.issueDate || null,
          expiryDate: input.expiryDate || null,
          version: 1,
          createdBy: actorId || null,
        },
      });

      // 2. Create DocumentOwner mapping
      await client.documentOwner.create({
        data: {
          documentId: document.id,
          ownerId: ownerId,
          ownerType,
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

      // 4. Publish outbox event
      await client.outboxEvent.create({
        data: {
          eventType: 'DocumentUploaded',
          aggregateType: 'Document',
          aggregateId: document.id,
          payload: {
            id: document.id,
            fileName: document.fileName,
            fileKey: document.fileKey,
            fileType: document.fileType,
            documentType: document.documentType,
            branchId: document.branchId,
            ownerId,
            ownerType,
          },
          availableAt: new Date(),
        },
      });

      // 5. Create Audit Log
      await client.auditLog.create({
        data: {
          action: 'DocumentUploaded',
          entityType: 'Document',
          entityId: document.id,
          performedBy: actorId || null,
          branchId: branchId,
          performedAt: new Date(),
          module: 'DocumentManagement',
          newValue: {
            id: document.id,
            documentType: document.documentType,
          },
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
  ): Promise<DocumentWithLatestVerification[]> {
    const client = tx || this.prisma;

    return client.document.findMany({
      where: {
        owners: {
            some: {
              ownerId,
              ownerType,
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
  ): Promise<DocumentWithLatestVerification[]> {
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
              ownerType: ref.ownerType,
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

  async applyVerificationDecision(
    documentId: string,
    outcome: VerificationOutcome,
    remarks?: string,
    actorId?: string,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = tx || this.prisma;

    const document = await client.document.findUnique({
      where: { id: documentId },
    });
    if (!document || document.isDeleted) {
      throw new Error('DOC_NOT_FOUND');
    }

    if (outcome === 'Rejected' && (!remarks || remarks.trim() === '')) {
      throw new Error('DOC_REJECT_REMARKS_REQUIRED');
    }

    await client.documentVerification.create({
      data: {
        documentId,
        outcome,
        remarks: outcome === 'Rejected' ? remarks : null,
        verifiedBy: actorId || null,
        verifiedAt: new Date(),
        createdBy: actorId || null,
      },
    });

    await client.document.update({
      where: { id: documentId, version: document.version },
      data: {
        version: { increment: 1 },
      },
    });

    // Publish Outbox Event
    await client.outboxEvent.create({
      data: {
        eventType: outcome === 'Verified' ? 'DocumentVerified' : 'DocumentRejected',
        aggregateType: 'Document',
        aggregateId: documentId,
        payload: {
          id: documentId,
          outcome,
          remarks: remarks || null,
        },
        availableAt: new Date(),
      },
    });

    // Create Audit Log
    await client.auditLog.create({
      data: {
        action: outcome === 'Verified' ? 'DocumentVerified' : 'DocumentRejected',
        entityType: 'Document',
        entityId: documentId,
        performedBy: actorId || null,
        branchId: document.branchId,
        performedAt: new Date(),
        module: 'DocumentManagement',
        newValue: {
          outcome,
          remarks: remarks || null,
        },
      },
    });
  }

  async retireDocument(
    documentId: string,
    actorId?: string,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = tx || this.prisma;

    const document = await client.document.findUnique({
      where: { id: documentId },
    });
    if (!document || document.isDeleted) {
      throw new Error('DOC_NOT_FOUND');
    }

    await client.document.update({
      where: { id: documentId, version: document.version },
      data: {
        isDeleted: true,
        status: 'Deleted',
        deletedAt: new Date(),
        deletedBy: actorId || null,
        version: { increment: 1 },
      },
    });

    // Publish Outbox Event
    await client.outboxEvent.create({
      data: {
        eventType: 'DocumentRetired',
        aggregateType: 'Document',
        aggregateId: documentId,
        payload: {
          id: documentId,
        },
        availableAt: new Date(),
      },
    });

    // Create Audit Log
    await client.auditLog.create({
      data: {
        action: 'DocumentRetired',
        entityType: 'Document',
        entityId: documentId,
        performedBy: actorId || null,
        branchId: document.branchId,
        performedAt: new Date(),
        module: 'DocumentManagement',
        newValue: {
          isDeleted: true,
          status: 'Deleted',
        },
      },
    });
  }
}
