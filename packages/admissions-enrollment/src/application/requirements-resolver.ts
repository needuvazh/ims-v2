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
      select: {
        branchCode: true,
        policies: {
          where: {
            policyType: 'REQUIRED_DOCUMENTS',
            isDeleted: false,
          },
          select: {
            policyContent: true,
          },
        },
      },
    });

    if (branch && branch.policies) {
      // Parse branch policies for required documents
      for (const policy of branch.policies) {
        try {
          const docList = JSON.parse(policy.policyContent || '[]');
          if (Array.isArray(docList)) {
            for (const doc of docList) {
              if (VALID_DOCUMENT_TYPES.includes(doc as DocumentType)) {
                resolved.add(doc as DocumentType);
              }
            }
          }
        } catch (e) {
          // Ignore invalid JSON in policy content
        }
      }
    }

    // 3. Fetch and merge Course level rules (override default/metadata)
    if (courseId) {
      const course = await client.course.findUnique({
        where: { id: courseId },
        select: { courseCode: true },
      });

      if (course) {
        // Precedence: Course code CORP requires SPONSORSHIP_LETTER
        if (course.courseCode?.toUpperCase().includes('CORP')) {
          resolved.add('SPONSORSHIP_LETTER');
        }
      }
    }

    return Array.from(resolved);
  }
}
