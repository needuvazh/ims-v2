## Why

ASTI requires a dedicated Finance & Receivables bounded context to support student/corporate billing, invoice management, cash collections/payments, refunds, and financial reporting. Previously, the system did not support print-quality invoice/receipt downloads, had serialization issues due to database Decimal formats, and lacked responsive dashboards with comparative trends.

## What Changes

- Add invoice list management and interactive dashboard.
- Create an API route `/api/v1/finance/invoices/[id]/download` to generate and print bilingual invoices/receipts using pure semantic HTML layouts.
- Convert all internal database Decimal columns to plain JavaScript Numbers before passing them to Client Components, completely preventing Next.js hydration and serialization crashes.
- Design and integrate multiple interactive, highly visual metrics:
  - Total collected revenue, outstanding dues, and collection rate metrics with Omani Rial `ر.ع.` currency prefixes.
  - Interactive Revenue Trend (6-month Bar Chart).
  - MoM Revenue Comparative Trend (daily line comparison) and YoY Revenue Comparative Trend (monthly line comparison) as separate, concurrent Line Charts.
  - Clear breakdown cards for payment status ratios, outstanding aging segments, and B2B corporate billing percentages.
- Minimize whitespace and optimize layout sizing across all dashboard elements to provide a compact, highly dense visual experience.

## Capabilities

### New Capabilities
- `finance-receivables`: Invoice listing, bilingual print-ready download actions, Omani tax invoice structure, and detailed dashboard statistics.

### Modified Capabilities
- `permissions-and-branch-scope`: Added `dashboard.finance` and invoice management permissions mapped dynamically to ASTI Finance managers and administrators.
- `reports-dashboards`: Added finance dashboard client component displaying comparative trends, collections tracking, and B2B clients.

## Impact

- Isolated Next.js route handlers under `apps/admin-portal/app/api/v1/finance/invoices/[id]/download/route.ts`.
- Updates to `apps/admin-portal/app/(protected)/finance/page.tsx` and `invoices/page.tsx` for decimal mappings.
- Clean design grids added in `apps/admin-portal/app/(protected)/finance/_components/finance-dashboard-client.tsx` to handle co-existing MoM and YoY line charts.
- Unit, database integration, and rendering validation.
