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
    tx?: Prisma.TransactionClient
  ): Promise<DocumentType[]> {
    const client = tx || this.prisma;

    // 1. Base requirements (always required for all branches/courses)
    const resolved = new Set<DocumentType>(['CIVIL_ID_FRONT']);

    // 2. Fetch and merge Branch level policy/rules
    const branch = await client.branch.findUnique({
      where: { id: branchId },
      select: { branchCode: true, metadata: true } as any,
    }) as any;

    if (branch) {
      // Branch specific metadata rule
      const branchMeta = branch.metadata as any;
      if (branchMeta && Array.isArray(branchMeta.requiredDocuments)) {
        for (const doc of branchMeta.requiredDocuments) {
          if (VALID_DOCUMENT_TYPES.includes(doc as DocumentType)) {
            resolved.add(doc as DocumentType);
          }
        }
      }
    }

    // 3. Fetch and merge Course level rules (override default/metadata)
    if (courseId) {
      const course = await client.course.findUnique({
        where: { id: courseId },
        select: { courseCode: true, metadata: true } as any,
      }) as any;

      if (course) {
        // Precedence: Course code CORP requires SPONSORSHIP_LETTER
        if (course.courseCode?.toUpperCase().includes('CORP')) {
          resolved.add('SPONSORSHIP_LETTER');
        }

        // Course metadata rule
        const courseMeta = course.metadata as any;
        if (courseMeta && Array.isArray(courseMeta.requiredDocuments)) {
          for (const doc of courseMeta.requiredDocuments) {
            if (VALID_DOCUMENT_TYPES.includes(doc as DocumentType)) {
              resolved.add(doc as DocumentType);
            }
          }
        }
      }
    }

    return Array.from(resolved);
  }
}
