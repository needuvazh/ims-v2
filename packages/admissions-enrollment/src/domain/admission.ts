import { z } from 'zod';

export const CreateStudentAdmissionSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  branchId: z.string().uuid(),
  leadId: z.string().uuid().nullable().optional(),
});

export type CreateStudentAdmissionInput = z.infer<typeof CreateStudentAdmissionSchema>;

export interface IAdmissionRepository {
  findByEmailOrPhone(email: string | null, phone: string | null, tx?: any): Promise<any>;
  createStudentAndAdmission(data: CreateStudentAdmissionInput, studentNumber: string, tx?: any): Promise<{ studentId: string, admissionId: string }>;
}
