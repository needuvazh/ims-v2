import { z } from "zod";

// Zod schemas for corporate accounts validation
export const CreateCorporateAccountSchema = z.object({
  accountName: z.string().min(1, "Company Name is required").max(150, "Name cannot exceed 150 characters"),
  accountCode: z.string().min(1, "Account Code is required").max(50, "Code cannot exceed 50 characters"),
  branchId: z.string().uuid("Please select a valid Branch"),
  creditLimit: z.coerce.number().min(0, "Credit Limit must be a positive number"),
  blockOnCreditLimit: z.boolean(),
  billingCycle: z.string(),
  status: z.string(),
});

export const UpdateCorporateAccountSchema = z.object({
  accountName: z.string().min(1, "Company Name is required").max(150, "Name cannot exceed 150 characters"),
  branchId: z.string().uuid("Please select a valid Branch"),
  creditLimit: z.coerce.number().min(0, "Credit Limit must be a positive number"),
  blockOnCreditLimit: z.boolean(),
  billingCycle: z.string(),
  status: z.string(),
});

export type CreateCorporateAccountInput = z.infer<typeof CreateCorporateAccountSchema>;
export type UpdateCorporateAccountInput = z.infer<typeof UpdateCorporateAccountSchema>;

// Zod validation schemas for corporate contacts
export const CreateCorporateContactSchema = z.object({
  firstName: z.string().min(1, "First Name is required").max(100),
  lastName: z.string().min(1, "Last Name is required").max(100),
  nationalId: z.string().min(1, "National ID is required").max(50),
  email: z.string().email("Invalid email address").max(255),
  phone: z.string().min(1, "Mobile number is required").max(32),
  designation: z.string().min(1, "Designation is required").max(150),
  department: z.string().min(1, "Department is required").max(150),
  isPrimary: z.boolean(),
  portalAccessEnabled: z.boolean(),
});

export const UpdateCorporateContactSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  phone: z.string().min(1, "Mobile number is required").max(32),
  designation: z.string().min(1, "Designation is required").max(150),
  department: z.string().min(1, "Department is required").max(150),
  isPrimary: z.boolean(),
  portalAccessEnabled: z.boolean(),
  status: z.string(),
});

export type CreateCorporateContactInput = z.infer<typeof CreateCorporateContactSchema>;
export type UpdateCorporateContactInput = z.infer<typeof UpdateCorporateContactSchema>;

// Zod schemas for corporate participant nominations
export const NominateCorporateParticipantSchema = z.object({
  firstName: z.string().min(1, "First Name is required").max(100),
  lastName: z.string().min(1, "Last Name is required").max(100),
  nationalId: z.string().min(1, "National ID is required").max(50),
  email: z.string().email("Invalid email address").max(255).nullable().optional(),
  phone: z.string().min(1, "Mobile number is required").max(32),
  employeeCode: z.string().max(80).nullable().optional(),
  designation: z.string().max(150).nullable().optional(),
  department: z.string().max(150).nullable().optional(),
});

export type NominateCorporateParticipantInput = z.infer<typeof NominateCorporateParticipantSchema>;

// Zod schemas for corporate contracts validation
export const CreateCorporateContractSchema = z.object({
  contractNumber: z.string().min(1, "Contract Number is required").max(80),
  contractValue: z.coerce.number().min(0, "Contract Value must be a positive number"),
  startDate: z.string().min(1, "Start Date is required"),
  endDate: z.string().min(1, "End Date is required"),
  billingModel: z.string().min(1, "Billing Model is required"),
  paymentTerms: z.string().min(1, "Payment Terms is required"),
  status: z.string().min(1, "Status is required"),
});

export type CreateCorporateContractInput = z.infer<typeof CreateCorporateContractSchema>;
