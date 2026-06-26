import { PrismaClient, Prisma } from '@prisma/client';
import { IAdmissionRepository, CreateStudentAdmissionInput } from '../domain/admission';

export class AdmissionRepository implements IAdmissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmailOrPhone(email: string | null, phone: string | null, tx?: Prisma.TransactionClient): Promise<any> {
    const client = tx || this.prisma;
    
    if (!email && !phone) return null;

    const OR: any[] = [];
    if (email) OR.push({ email });
    if (phone) OR.push({ phone });

    return client.student.findFirst({
      where: { OR },
    });
  }

  async createStudentAndAdmission(data: CreateStudentAdmissionInput, studentNumber: string, tx?: Prisma.TransactionClient): Promise<{ studentId: string; admissionId: string; }> {
    const client = tx || this.prisma;
    
    // Create student
    const student = await client.student.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
        studentNumber,
      },
    });

    // Create admission
    const admission = await client.admission.create({
      data: {
        studentId: student.id,
        branchId: data.branchId,
        leadId: data.leadId || null,
      },
    });

    return {
      studentId: student.id,
      admissionId: admission.id,
    };
  }
}
