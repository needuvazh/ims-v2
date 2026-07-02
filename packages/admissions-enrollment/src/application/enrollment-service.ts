import { PrismaClient, Prisma } from '@prisma/client';
import { RequirementsResolver } from './requirements-resolver';
import { DocumentsService } from '@ims/documents';

export class EnrollmentService {
  constructor(private readonly prisma: PrismaClient) {}

  async createEnrollment(data: any, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;

    // Generate enrollment number
    const enrollmentNumber = `ENR-${Date.now().toString().slice(-6)}`;

    // Resolve course price
    const coursePricing = await client.coursePricing.findFirst({
      where: { courseId: data.courseId, status: 'Active', isDeleted: false },
    });

    const price = coursePricing?.basePrice || new Prisma.Decimal(0);

    return client.enrollment.create({
      data: {
        enrollmentNumber,
        studentProfileId: data.studentProfileId,
        admissionId: data.admissionId,
        courseId: data.courseId,
        batchId: data.batchId,
        branchId: data.branchId,
        resolvedPrice: price,
        finalAmount: price,
        enrollmentStatus: 'Draft',
      },
    });
  }

  async confirmEnrollment(enrollmentId: string, actorId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;

    const enrollment = await client.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        admission: true,
      },
    });

    if (!enrollment) {
      throw new Error('ERR_ENROLLMENT_NOT_FOUND');
    }

    if (enrollment.enrollmentStatus !== 'Draft') {
      throw new Error('ERR_ENROLLMENT_INVALID_STATUS_TRANSITION');
    }

    // Run verification gate
    await this.verifyEnrollmentDocumentsGate(enrollmentId, client);

    // Update status to Confirmed
    await client.enrollment.update({
      where: { id: enrollmentId },
      data: {
        enrollmentStatus: 'Confirmed',
        confirmedAt: new Date(),
      },
    });
  }

  async verifyEnrollmentDocumentsGate(enrollmentId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;

    const enrollment = await client.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        admission: true,
      },
    });

    if (!enrollment) {
      throw new Error('ERR_ENROLLMENT_NOT_FOUND');
    }

    // Resolve requirements
    const resolver = new RequirementsResolver(this.prisma);
    const requiredTypes = await resolver.getRequiredDocuments(enrollment.courseId, enrollment.branchId, client);

    if (requiredTypes.length === 0) {
      return;
    }

    // Fetch documents for all related owners: Person, StudentProfile, Admission, Enrollment
    const documentsService = new DocumentsService(this.prisma);
    const owners: { ownerId: string; ownerType: any }[] = [
      { ownerId: enrollment.admission.personId, ownerType: 'Person' },
      { ownerId: enrollment.studentProfileId, ownerType: 'StudentProfile' },
      { ownerId: enrollment.admissionId, ownerType: 'Admission' },
      { ownerId: enrollment.id, ownerType: 'Enrollment' },
    ];
    const documents = await documentsService.getDocumentsByOwners(owners, client);

    const missingTypes: string[] = [];

    for (const reqType of requiredTypes) {
      const hasVerifiedDoc = documents.some((doc) => {
        if (doc.documentType !== reqType || doc.status !== 'Active') {
          return false;
        }
        const latestVerification = doc.verifications[0];
        return latestVerification && latestVerification.outcome === 'Verified';
      });

      if (!hasVerifiedDoc) {
        missingTypes.push(reqType);
      }
    }

    if (missingTypes.length > 0) {
      throw new Error(`ERR_DOCUMENTS_VERIFICATION_GATE_FAILED: Missing or unverified documents: ${missingTypes.join(', ')}`);
    }
  }
}
