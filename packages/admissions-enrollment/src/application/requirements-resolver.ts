import { PrismaClient, Prisma } from '@prisma/client';
import { DocumentType } from '@ims/documents';

// List of valid document types for validation
const VALID_DOCUMENT_TYPES: DocumentType[] = [
  'CIVIL_ID_FRONT',
  'CIVIL_ID_BACK',
  'PASSPORT_SCAN',
  'ACADEMIC_TRANSCRIPT',
  'SPONSORSHIP_LETTER',
  'OTHER',
];

export class RequirementsResolver {
  constructor(private readonly prisma: PrismaClient) {}

  async getRequiredDocuments(
    courseId: string | null,
    branchId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<DocumentType[]> {
    const client = tx || this.prisma;

    // Fetch dynamic requirements matching targetEntity = STUDENT
    const requirements = await client.documentRequirement.findMany({
      where: {
        targetEntity: 'STUDENT',
        status: 'Active',
        isMandatory: true,
        OR: [
          { branchId: null, courseId: null },
          { branchId: branchId, courseId: null },
          { branchId: null, courseId: courseId || undefined },
          { branchId: branchId, courseId: courseId || undefined },
        ],
      },
    });

    const resolved = new Set<DocumentType>(
      requirements.map((r) => r.documentType as DocumentType),
    );

    return Array.from(resolved);
  }
}
