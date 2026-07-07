import { z } from 'zod';

export const LanguageSchema = z.enum(['en', 'ar']);

export const CertificateReadinessValidationInputSchema = z.object({
  enrollmentId: z.string().uuid(),
  requestedLanguage: LanguageSchema,
  actorUserId: z.string().uuid(),
  requestedBranchId: z.string().uuid().optional(),
});

export const GenerateCertificateCommandSchema = z.object({
  enrollmentId: z.string().uuid(),
  language: LanguageSchema,
  expectedReadinessToken: z.string().optional(),
  idempotencyKey: z.string().min(8).max(128),
  requestedBranchId: z.string().uuid().optional(),
});

export const IssueCertificateCommandSchema = z.object({
  certificateId: z.string().uuid(),
  expectedVersion: z.number().int().min(1),
  idempotencyKey: z.string().min(8).max(128),
  issueReason: z.string().optional(),
});

export const PublicVerificationInputSchema = z.object({
  verificationCode: z.string().trim().min(1).max(256),
});

export const SubmitReissueRequestSchema = z.object({
  certificateId: z.string().uuid(),
  reason: z.string().trim().min(10).max(1000),
  expectedCertificateVersion: z.number().int().min(1).optional(),
});

export const ReviewReissueRequestSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(['APPROVE', 'REJECT']),
  remarks: z.string().trim().max(1000).optional(),
  expectedVersion: z.number().int().min(1),
});

export const GenerateReplacementCertificateSchema = z.object({
  reissueRequestId: z.string().uuid(),
  language: LanguageSchema.optional(),
  expectedVersion: z.number().int().min(1),
  idempotencyKey: z.string().min(8).max(128),
});

export const RevokeCertificateSchema = z.object({
  certificateId: z.string().uuid(),
  reason: z.string().trim().min(10).max(1000),
  expectedVersion: z.number().int().min(1),
});

export type Language = z.infer<typeof LanguageSchema>;
export type CertificateReadinessValidationInput = z.infer<typeof CertificateReadinessValidationInputSchema>;
export type GenerateCertificateCommand = z.infer<typeof GenerateCertificateCommandSchema>;
export type IssueCertificateCommand = z.infer<typeof IssueCertificateCommandSchema>;
export type PublicVerificationInput = z.infer<typeof PublicVerificationInputSchema>;
export type SubmitReissueRequest = z.infer<typeof SubmitReissueRequestSchema>;
export type ReviewReissueRequest = z.infer<typeof ReviewReissueRequestSchema>;
export type GenerateReplacementCertificate = z.infer<typeof GenerateReplacementCertificateSchema>;
export type RevokeCertificate = z.infer<typeof RevokeCertificateSchema>;
