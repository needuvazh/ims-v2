import { z } from "zod";

const datePreprocess = z.preprocess((val) => {
  if (typeof val === "string") {
    if (!val.trim()) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d;
  }
  return val;
}, z.date({ invalid_type_error: "Invalid date format" }));

const optionalDatePreprocess = z.preprocess((val) => {
  if (typeof val === "string") {
    if (!val.trim()) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return val;
}, z.date().nullable().optional());

export const CreateCorporateSalesLeadSchema = z.object({
  corporateAccountId: z.string().uuid(),
  leadId: z.string().uuid().nullable().optional(),
  salesOwnerId: z.string().uuid(),
  branchId: z.string().uuid(),
  stage: z.string().default("New"),
  expectedValue: z.number().nonnegative(),
  expectedCloseDate: datePreprocess,
});

export type CreateCorporateSalesLeadInput = z.infer<typeof CreateCorporateSalesLeadSchema>;

export const LogMarketingVisitSchema = z.object({
  corporateSalesLeadId: z.string().uuid(),
  corporateAccountId: z.string().uuid(),
  companyNameSnapshot: z.string().min(1),
  contactPersonNameSnapshot: z.string().min(1),
  contactNumberSnapshot: z.string().min(1),
  emailSnapshot: z.string().email(),
  meetingDate: datePreprocess,
  discussionNotes: z.string().min(1),
  coursesDiscussed: z.string().min(1),
  expectedCandidates: z.number().int().nonnegative(),
  expectedTrainingDate: datePreprocess,
  visitOutcome: z.string().nullable().optional(),
  branchId: z.string().uuid(),
});

export type LogMarketingVisitInput = z.infer<typeof LogMarketingVisitSchema>;

export const CreateFollowUpSchema = z.object({
  corporateSalesLeadId: z.string().uuid(),
  assignedToUserId: z.string().uuid(),
  followUpDate: datePreprocess,
  followUpType: z.string().min(1), // Call, Email, Meeting
  notes: z.string().min(1),
  outcome: z.string().nullable().optional(),
  nextFollowUpDate: optionalDatePreprocess,
  status: z.string().default("Scheduled"),
  branchId: z.string().uuid(),
});

export type CreateFollowUpInput = z.infer<typeof CreateFollowUpSchema>;

export const QuotationLineItemInputSchema = z.object({
  courseId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
});

export const CreateQuotationSchema = z.object({
  corporateAccountId: z.string().uuid(),
  corporateSalesLeadId: z.string().uuid(),
  quotationDate: datePreprocess,
  validUntil: datePreprocess,
  branchId: z.string().uuid(),
  corporateMarketingVisitId: z.string().uuid().optional().nullable(),
  lineItems: z.array(QuotationLineItemInputSchema).min(1, "Quotation must have at least one line item"),
});

export type CreateQuotationInput = z.infer<typeof CreateQuotationSchema>;

export const ConfigureCostingSheetSchema = z.object({
  quotationId: z.string().uuid(),
  trainerCost: z.number().nonnegative().default(0),
  venueCost: z.number().nonnegative().default(0),
  equipmentCost: z.number().nonnegative().default(0),
  printingCost: z.number().nonnegative().default(0),
  certificateCost: z.number().nonnegative().default(0),
  travelCost: z.number().nonnegative().default(0),
  accommodationCost: z.number().nonnegative().default(0),
  foodCost: z.number().nonnegative().default(0),
  vehicleCost: z.number().nonnegative().default(0),
  administrationCost: z.number().nonnegative().default(0),
  marketingCost: z.number().nonnegative().default(0),
  miscellaneousCost: z.number().nonnegative().default(0),
  sellingPrice: z.number().positive(),
  directCosts: z.array(
    z.object({
      costElementId: z.string().uuid(),
      amount: z.number().nonnegative(),
    })
  ).optional(),
});

export type ConfigureCostingSheetInput = z.infer<typeof ConfigureCostingSheetSchema>;

export const ConfirmSalesOrderSchema = z.object({
  quotationId: z.string().uuid(),
  corporateAccountId: z.string().uuid(),
  orderDate: datePreprocess,
  totalAmount: z.number().positive(),
  LpoDocumentId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid(),
});

export type ConfirmSalesOrderInput = z.infer<typeof ConfirmSalesOrderSchema>;
