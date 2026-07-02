import { Prisma } from '@prisma/client';
import { IAdmissionRepository, CreateStudentProfileAdmissionInput } from '../domain/admission';

export class AdmissionService {
  constructor(private readonly admissionRepository: IAdmissionRepository) {}

  async createStudentAdmission(input: CreateStudentProfileAdmissionInput, tx?: Prisma.TransactionClient) {
    // 1. Check for duplicates
    const existingPerson = await this.admissionRepository.findPersonByEmailOrPhone(input.email || null, input.phone || null, tx);

    if (existingPerson) {
      const existingProfile = await this.admissionRepository.findStudentProfileByPersonId(existingPerson.id, tx);
      if (existingProfile) {
        throw new Error(`A student profile already exists for this person (Student Number: ${existingProfile.studentNumber})`);
      }
    }

    // 2. Generate student number
    const studentNumber = `STU-${Date.now().toString().slice(-6)}`; // Simple generation for now

    // 3. Create records
    return this.admissionRepository.createStudentProfileAndAdmission(input, studentNumber, tx);
  }
}
