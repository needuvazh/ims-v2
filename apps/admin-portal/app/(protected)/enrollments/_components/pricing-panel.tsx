'use client';

import { Card, Badge } from '@ims/shared-ui';
import { Landmark, Calendar } from 'lucide-react';

interface PricingPanelProps {
  pricingSource: string;
  resolvedPrice: string;
  resolvedDiscount: string;
  finalAmount: string;
  paymentValidationRequired: boolean;
  priceEvaluationTimestamp: string | null;
}

export function PricingPanel({
  pricingSource,
  resolvedPrice,
  resolvedDiscount,
  finalAmount,
  paymentValidationRequired,
  priceEvaluationTimestamp,
}: PricingPanelProps) {
  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'BatchLevelOverride':
      case 'BatchLevel':
        return (
          <Badge className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50">
            Batch Level Override
          </Badge>
        );
      case 'BranchLevelOverride':
      case 'BranchLevel':
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">
            Branch Level Override
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-50">
            Global Default
          </Badge>
        );
    }
  };

  return (
    <Card className="bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <Landmark className="h-4.5 w-4.5 text-indigo-600" />
          <h4 className="font-semibold text-slate-800 text-sm uppercase">
            Pricing Resolution Details
          </h4>
        </div>
        <div>{getSourceBadge(pricingSource)}</div>
      </div>

      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Base Catalog Price:</span>
          <span className="font-medium text-slate-700 font-mono">
            OMR {Number(resolvedPrice).toFixed(3)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Applied Discount:</span>
          <span className="font-semibold text-emerald-600 font-mono">
            - OMR {Number(resolvedDiscount).toFixed(3)}
          </span>
        </div>
        <div className="border-t border-dashed border-slate-100 pt-2 flex justify-between items-baseline">
          <span className="text-sm font-semibold text-slate-800">
            Final Net Amount:
          </span>
          <span className="text-xl font-extrabold text-slate-900 font-mono">
            OMR {Number(finalAmount).toFixed(3)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Payment Validation:</span>
          <span className="font-medium text-slate-700">
            {paymentValidationRequired ? 'Required' : 'Not required'}
          </span>
        </div>
      </div>

      {priceEvaluationTimestamp && (
        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            Evaluated on {new Date(priceEvaluationTimestamp).toLocaleString()}
          </span>
        </div>
      )}
    </Card>
  );
}
