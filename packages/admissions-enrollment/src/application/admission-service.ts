import { Prisma } from '@prisma/client';
import { IAdmissionRepository, CreateStudentAdmissionInput } from '../domain/admission';

export class AdmissionService {
  constructor(private readonly admissionRepository: IAdmissionRepository) {}

  async createStudentAdmission(input: CreateStudentAdmissionInput, tx?: Prisma.TransactionClient) {
    // 1. Check for duplicates
    const existing = await this.admissionRepository.findByEmailOrPhone(input.email || null, input.phone || null, tx);
    
    if (existing) {
      throw new Error(`A student with this email or phone already exists (Student Number: ${existing.studentNumber})`);
    }

    // 2. Generate student number
    const studentNumber = `STU-${Date.now().toString().slice(-6)}`; // Simple generation for now

    // 3. Create records
    return this.admissionRepository.createStudentAndAdmission(input, studentNumber, tx);
  }
}
