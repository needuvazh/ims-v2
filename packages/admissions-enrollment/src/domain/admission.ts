import { z } from 'zod';

export const CreateStudentProfileAdmissionSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(1),
  branchId: z.string().uuid(),
  leadId: z.string().uuid().nullable().optional(),
});

export type CreateStudentProfileAdmissionInput = z.infer<typeof CreateStudentProfileAdmissionSchema>;

export interface IAdmissionRepository {
  findPersonByEmailOrPhone(email: string | null, phone: string | null, tx?: any): Promise<any>;
  findStudentProfileByPersonId(personId: string, tx?: any): Promise<any>;
  createStudentProfileAndAdmission(data: CreateStudentProfileAdmissionInput, studentNumber: string, tx?: any): Promise<{ personId: string; studentProfileId: string; admissionId: string }>;
}
