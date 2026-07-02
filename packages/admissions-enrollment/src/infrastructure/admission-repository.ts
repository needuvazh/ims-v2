import { PrismaClient, Prisma } from '@prisma/client';
import { IAdmissionRepository, CreateStudentProfileAdmissionInput } from '../domain/admission';

export class AdmissionRepository implements IAdmissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findPersonByEmailOrPhone(email: string | null, phone: string | null, tx?: Prisma.TransactionClient): Promise<any> {
    const client = tx || this.prisma;
    
    if (!email && !phone) return null;

    const OR: any[] = [];
    if (email) OR.push({ email });
    if (phone) OR.push({ mobile: phone });

    return client.person.findFirst({
      where: { OR },
    });
  }

  async findStudentProfileByPersonId(personId: string, tx?: Prisma.TransactionClient): Promise<any> {
    const client = tx || this.prisma;

    return client.studentProfile.findFirst({
      where: { personId },
    });
  }

  async getNextStudentNumber(tx?: Prisma.TransactionClient): Promise<string> {
    const client = tx || this.prisma;
    const result = await client.$queryRawUnsafe<{ nextval: string }[]>("SELECT nextval('student_number_seq')::text as nextval");
    const seq = result[0]?.nextval || '10000';
    return `STU-2026-${seq.padStart(5, '0')}`;
  }

  async getNextAdmissionNumber(tx?: Prisma.TransactionClient): Promise<string> {
    const client = tx || this.prisma;
    const result = await client.$queryRawUnsafe<{ nextval: string }[]>("SELECT nextval('admission_number_seq')::text as nextval");
    const seq = result[0]?.nextval || '10000';
    return `ADM-2026-${seq.padStart(5, '0')}`;
  }

  async hasActiveAdmission(studentProfileId: string, branchId: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    const client = tx || this.prisma;
    const count = await client.admission.count({
      where: {
        studentProfileId,
        branchId,
        isDeleted: false,
        admissionStatus: {
          in: ['Draft', 'Submitted', 'Approved']
        }
      }
    });
    return count > 0;
  }

  async createAdmissionDraft(
    studentProfileId: string,
    branchId: string,
    admissionNumber: string,
    courseId?: string | null,
    leadId?: string | null,
    tx?: Prisma.TransactionClient
  ): Promise<{ admissionId: string }> {
    const client = tx || this.prisma;
    const studentProfile = await client.studentProfile.findUnique({
      where: { id: studentProfileId }
    });
    if (!studentProfile) {
      throw new Error('ERR_STUDENT_PROFILE_NOT_FOUND');
    }
    const admission = await client.admission.create({
      data: {
        admissionNumber,
        personId: studentProfile.personId,
        studentProfileId,
        branchId,
        courseId: courseId || null,
        leadId: leadId || null,
        admissionStatus: 'Draft',
      }
    });
    return { admissionId: admission.id };
  }

  async createStudentProfileAndAdmission(data: CreateStudentProfileAdmissionInput, studentNumber: string, tx?: Prisma.TransactionClient): Promise<{ personId: string; studentProfileId: string; admissionId: string; admissionNumber: string; }> {
    const client = tx || this.prisma;

    let person = await this.findPersonByEmailOrPhone(data.email || null, data.phone || null, tx);

    if (!person) {
      person = await client.person.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          mobile: data.phone,
          email: data.email || null,
        },
      });
    }
    
    // Create or reuse student profile
    let studentProfile = await this.findStudentProfileByPersonId(person.id, tx);
    if (!studentProfile) {
      studentProfile = await client.studentProfile.create({
        data: {
          personId: person.id,
          studentNumber,
        },
      });
    }

    const admissionNumber = await this.getNextAdmissionNumber(tx);

    // Create admission
    const admission = await client.admission.create({
      data: {
        admissionNumber,
        personId: person.id,
        studentProfileId: studentProfile.id,
        branchId: data.branchId,
        leadId: data.leadId || null,
        courseId: data.courseId || null,
        admissionStatus: 'Draft',
      },
    });

    return {
      personId: person.id,
      studentProfileId: studentProfile.id,
      admissionId: admission.id,
      admissionNumber,
    };
  }
}

