import { z } from 'zod';

export const LeadStageEnum = z.enum([
  'New',
  'Contacted',
  'FollowUp',
  'Qualified',
  'Negotiation',
  'Won',
  'Converted',
  'Lost',
]);

export const LeadSourceEnum = z.enum([
  'WalkIn',
  'Web',
  'Campaign',
  'Referral',
  'Other',
  'Phone',
  'WhatsApp',
  'Facebook',
  'Instagram',
  'GoogleAds',
  'CorporateReferral',
]);

export const LeadSchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(1),
  stage: LeadStageEnum,
  source: LeadSourceEnum,
  counselorId: z.string().uuid().nullable().optional(),
  interestedCourseId: z.string().uuid(),
  notes: z.string().nullable().optional(),
  createdAt: z.date(),
});

export type Lead = z.infer<typeof LeadSchema>;
export type LeadStage = z.infer<typeof LeadStageEnum>;
export type LeadSource = z.infer<typeof LeadSourceEnum>;

export const CreateLeadSchema = z.object({
  branchId: z.string().uuid(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().min(1, 'Phone is required'),
  interestedCourseId: z.string().uuid('Interested course ID is required'),
  source: LeadSourceEnum.default('Other'),
  counselorId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;
