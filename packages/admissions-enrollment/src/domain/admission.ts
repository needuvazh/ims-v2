import { z } from 'zod';

export const CreateStudentProfileAdmissionSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(1),
  branchId: z.string().uuid(),
  leadId: z.string().uuid().nullable().optional(),
  courseId: z.string().uuid().nullable().optional(),
});

export type CreateStudentProfileAdmissionInput = z.infer<typeof CreateStudentProfileAdmissionSchema>;

export const CreateAdmissionInputSchema = z.object({
  studentProfileId: z.string().uuid(),
  courseId: z.string().uuid().nullable().optional(),
  leadId: z.string().uuid().nullable().optional(),
});

export type CreateAdmissionInput = z.infer<typeof CreateAdmissionInputSchema>;

export interface IAdmissionRepository {
  findPersonByEmailOrPhone(email: string | null, phone: string | null, tx?: any): Promise<any>;
  findStudentProfileByPersonId(personId: string, tx?: any): Promise<any>;
  createStudentProfileAndAdmission(data: CreateStudentProfileAdmissionInput, studentNumber: string, tx?: any): Promise<{ personId: string; studentProfileId: string; admissionId: string; admissionNumber: string }>;
  
  getNextStudentNumber(tx?: any): Promise<string>;
  getNextAdmissionNumber(tx?: any): Promise<string>;
  hasActiveAdmission(studentProfileId: string, branchId: string, tx?: any): Promise<boolean>;
  createAdmissionDraft(studentProfileId: string, branchId: string, admissionNumber: string, courseId?: string | null, leadId?: string | null, tx?: any): Promise<{ admissionId: string }>;
}
