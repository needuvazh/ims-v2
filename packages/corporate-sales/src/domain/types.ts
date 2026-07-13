export type CorporateSalesErrorCode =
  | "ERR_CSQ_INVALID_CLOSE_DATE"
  | "ERR_CSQ_MARGIN_SUB_THRESHOLD"
  | "ERR_CSQ_CONCURRENCY_ERROR"
  | "ERR_CSQ_QUOTE_LOCKED"
  | "ERR_CSQ_NOT_FOUND"
  | "ERR_CSQ_INVALID_DATE_RANGE"
  | "ERR_CSQ_VISIT_PAST_DATE"
  | "ERR_CSQ_FOLLOWUP_PAST_DATE";

export interface CorporateSalesErrorDetails {
  errorCode: CorporateSalesErrorCode;
  field?: string;
  [key: string]: unknown;
}

export interface CostingBreakdown {
  trainerCost: number;
  venueCost: number;
  equipmentCost: number;
  printingCost: number;
  certificateCost: number;
  travelCost: number;
  accommodationCost: number;
  foodCost: number;
  vehicleCost: number;
  administrationCost: number;
  marketingCost: number;
  miscellaneousCost: number;
  totalDirectCost: number;
  totalIndirectCost: number;
  totalCost: number;
  sellingPrice: number;
  profitAmount: number;
  profitPercentage: number;
}
