import { z } from 'zod';
import { Prisma } from '@prisma/client';

export const DocumentTypeEnum = z.enum([
  'CIVIL_ID_FRONT',
  'CIVIL_ID_BACK',
  'PASSPORT_SCAN',
  'ACADEMIC_TRANSCRIPT',
  'SPONSORSHIP_LETTER',
  'OTHER'
]);

export type DocumentType = z.infer<typeof DocumentTypeEnum>;

export const DocumentStatusEnum = z.enum([
  'Draft',
  'Active',
  'Expired',
  'Replaced',
  'Deleted'
]);

export type DocumentStatus = z.infer<typeof DocumentStatusEnum>;

export const OwnerTypeEnum = z.enum([
  'Person',
  'StudentProfile',
  'Admission',
  'Enrollment'
]);

export type OwnerType = z.infer<typeof OwnerTypeEnum>;

export const VerificationOutcomeEnum = z.enum([
  'Pending',
  'Verified',
  'Rejected'
]);

export type VerificationOutcome = z.infer<typeof VerificationOutcomeEnum>;

export const DocumentCaptureSchema = z.object({
  fileName: z.string().min(1),
  fileKey: z.string().min(1),
  fileType: z.string().min(1),
  documentType: DocumentTypeEnum,
  expiryDate: z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), z.date().optional().nullable()),
});

export type DocumentCaptureInput = z.infer<typeof DocumentCaptureSchema>;

export interface IDocumentsService {
  registerDocuments(
    ownerId: string,
    ownerType: OwnerType,
    branchId: string,
    inputs: DocumentCaptureInput[],
    tx: Prisma.TransactionClient,
    actorId?: string
  ): Promise<void>;

  verifyDocumentAccess(
    userId: string,
    documentId: string,
    tx?: Prisma.TransactionClient
  ): Promise<boolean>;

  verifyBranchAccess(
    userId: string,
    branchId: string,
    tx?: Prisma.TransactionClient
  ): Promise<boolean>;

  getDocumentsByOwner(
    ownerId: string,
    ownerType: OwnerType,
    tx?: Prisma.TransactionClient
  ): Promise<any[]>;

  getDocumentsByOwners(
    ownerRefs: { ownerId: string; ownerType: OwnerType }[],
    tx?: Prisma.TransactionClient
  ): Promise<any[]>;
}
