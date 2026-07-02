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

  async createStudentProfileAndAdmission(data: CreateStudentProfileAdmissionInput, studentNumber: string, tx?: Prisma.TransactionClient): Promise<{ personId: string; studentProfileId: string; admissionId: string; }> {
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
    
    // Create student profile
    const studentProfile = await client.studentProfile.create({
      data: {
        personId: person.id,
        studentNumber,
      },
    });

    const admissionNumber = `ADM-${Date.now().toString().slice(-6)}`;

    // Create admission
    const admission = await client.admission.create({
      data: {
        admissionNumber,
        personId: person.id,
        studentProfileId: studentProfile.id,
        branchId: data.branchId,
        leadId: data.leadId || null,
        admissionStatus: 'Draft',
      },
    });

    return {
      personId: person.id,
      studentProfileId: studentProfile.id,
      admissionId: admission.id,
    };
  }
}
