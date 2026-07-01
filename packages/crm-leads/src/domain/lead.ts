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
  leadNumber: z.string(),
  personId: z.string().uuid(),
  branchId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(1),
  stage: LeadStageEnum,
  source: LeadSourceEnum,
  counselorId: z.string().uuid().nullable().optional(),
  interestedCourseId: z.string().uuid(),
  campaignId: z.string().uuid().nullable().optional(),
  priority: z.string().default('Medium'),
  notes: z.string().nullable().optional(),
  lostReasonCode: z.string().nullable().optional(),
  lostReasonNotes: z.string().nullable().optional(),
  inquiryId: z.string().uuid().nullable().optional(),
  version: z.number().int().default(1),
  createdAt: z.date(),
  status: z.enum(['Draft', 'Active', 'Inactive', 'Archived']).default('Active'),
});

export type Lead = z.infer<typeof LeadSchema>;
export type LeadStage = z.infer<typeof LeadStageEnum>;
export type LeadSource = z.infer<typeof LeadSourceEnum>;

export const preprocessPhone = (val: unknown) => {
  if (typeof val !== 'string') return val;
  let cleaned = val.replace(/[\s\-\(\)]/g, ''); // Strip spaces, hyphens, parentheses
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }
  // Convert 9687XXXXXXX or 9689XXXXXXX to +968...
  if (cleaned.length === 11 && (cleaned.startsWith('9687') || cleaned.startsWith('9689'))) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
};

export const PhoneSchema = z.preprocess(
  preprocessPhone,
  z.string().refine((val) => {
    const omaniMobileRegex = /^(?:\+968)?[79]\d{7}$/;
    const internationalRegex = /^\+[1-9]\d{1,14}$/;
    return omaniMobileRegex.test(val) || internationalRegex.test(val);
  }, {
    message: 'Must be a valid Omani mobile number starting with 7 or 9, or a standard E.164 international phone number'
  })
);

export const IngestInquirySchema = z.object({
  branchId: z.string().uuid('Invalid branch ID format'),
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(100),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(100),
  mobile: PhoneSchema,
  email: z.string().email('Invalid email format').optional().nullable().or(z.literal('')),
  source: LeadSourceEnum,
  interestedCourseId: z.string().uuid('Invalid course reference').optional().nullable(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional().nullable(),
  utmSource: z.string().max(100).optional().nullable(),
  utmMedium: z.string().max(100).optional().nullable(),
  utmCampaign: z.string().max(100).optional().nullable(),
  bypassDuplicateBlock: z.boolean().default(false),
});

export type IngestInquiryInput = z.infer<typeof IngestInquirySchema>;

export const QualifyInquirySchema = z.object({
  interestedCourseId: z.string().uuid('Interested course ID is required'),
  counselorId: z.string().uuid('Counselor assignment is required').optional().nullable(),
  qualificationNotes: z.string().min(5, 'Qualification notes must specify reasoning').max(1000),
});

export type QualifyInquiryInput = z.infer<typeof QualifyInquirySchema>;

export const DateOfBirthSchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    if (!val.trim()) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d;
  }
  return val;
}, z.date({ invalid_type_error: 'Invalid date of birth' }).nullable().optional());

export const CreateLeadSchema = z.object({
  branchId: z.string().uuid('Invalid branch reference'),
  firstName: z.string().min(2, 'First name is required').max(100),
  lastName: z.string().min(2, 'Last name is required').max(100),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  phone: PhoneSchema,
  dateOfBirth: DateOfBirthSchema,
  interestedCourseId: z.string().uuid('Invalid course reference'),
  source: LeadSourceEnum.default('Other'),
  counselorId: z.string().uuid().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;

export const TransitionLeadStageSchema = z.object({
  newStage: LeadStageEnum,
  transitionNotes: z.string().max(1000).optional().nullable(),
  version: z.number().int('Optimistic concurrency version required'),
});

export type TransitionLeadStageInput = z.infer<typeof TransitionLeadStageSchema>;

export const CloseLeadLostSchema = z.object({
  lostReasonCode: z.string().min(1, 'Select a valid lost reason category'),
  lostReasonNotes: z.string().min(15, 'Explanatory notes must be at least 15 characters').max(1000),
});

export type CloseLeadLostInput = z.infer<typeof CloseLeadLostSchema>;

export const ScheduleFollowUpSchema = z.object({
  followUpDate: z.string().datetime('Invalid date-time format').refine((val) => {
    return new Date(val).getTime() > Date.now() + 300000; // Future date check (+5 min)
  }, { message: 'Schedule date-time must be set in the future' }),
  followUpType: z.enum(['Call', 'WhatsApp', 'Email', 'Visit']),
  agenda: z.string().min(5, 'Agenda must specify communication details').max(250),
});

export type ScheduleFollowUpInput = z.infer<typeof ScheduleFollowUpSchema>;

export const LogFollowUpOutcomeSchema = z.object({
  outcome: z.enum(['Answered', 'Busy', 'SwitchedOff', 'NoResponse', 'NotInterested', 'Interested', 'VisitScheduled']),
  outcomeNotes: z.string().min(15, 'Outcome notes must contain conversation detail'),
  scheduleNext: z.boolean(),
  version: z.number().int('Optimistic concurrency version required'),
  nextFollowUpDate: z.string().datetime().optional().nullable(),
  nextFollowUpType: z.enum(['Call', 'WhatsApp', 'Email', 'Visit']).optional().nullable(),
  nextFollowUpAgenda: z.string().max(250).optional().nullable(),
}).refine((data) => {
  if (data.scheduleNext) {
    if (!data.nextFollowUpDate || !data.nextFollowUpType || !data.nextFollowUpAgenda) {
      return false;
    }
    return new Date(data.nextFollowUpDate).getTime() > Date.now() + 300000;
  }
  return true;
}, {
  message: 'Next follow-up details are mandatory and must be scheduled at least 5 minutes in the future',
  path: ['nextFollowUpDate'],
});

export type LogFollowUpOutcomeInput = z.infer<typeof LogFollowUpOutcomeSchema>;

export const RevealPiiSchema = z.object({
  field: z.enum(['email', 'phone', 'nationalId']),
  reason: z.string().min(5, 'Reason for viewing PII is mandatory').max(200),
});

export type RevealPiiInput = z.infer<typeof RevealPiiSchema>;

// PII Masking Utilities
export const maskEmail = (email: string | null | undefined): string | null => {
  if (!email) return null;
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0] || ''}*@${domain}`;
  }
  return `${local[0]}******${local[local.length - 1]}@${domain}`;
};

export const maskPhone = (phone: string | null | undefined): string | null => {
  if (!phone) return null;
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.length < 7) return phone;
  const last = cleaned.substring(cleaned.length - 3);
  if (cleaned.startsWith('+968')) {
    const omaniHeader = '+968';
    const carrier = cleaned.substring(4, cleaned.length - 3);
    if (carrier.length > 2) {
      return `${omaniHeader} ${carrier.substring(0, 2)}***${last}`;
    }
    return `${omaniHeader} ***${last}`;
  }
  const first = cleaned.substring(0, cleaned.length - 6);
  return `${first}***${last}`;
};

export const maskNationalId = (nationalId: string | null | undefined): string | null => {
  if (!nationalId) return null;
  if (nationalId.length < 4) return '****';
  return `${nationalId.substring(0, 2)}******${nationalId.substring(nationalId.length - 2)}`;
};

export const ConvertLeadSchema = z.object({
  documentLinks: z.array(z.string().url("Must be a valid document url")).min(1, "At least one identity document is required for conversion"),
});

export type ConvertLeadInput = z.infer<typeof ConvertLeadSchema>;

