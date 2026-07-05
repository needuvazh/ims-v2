## Context

The Finance module handles billing and payments in ASTI IMS. The database schema already defines Invoice, Payment, Receipt, and Refund models, but their operational flows were not exposed to UI, had serialization flaws, and lacked billing trend charts. 

This change addresses these gaps by creating print-ready document downloads, mapping decimal database fields to plain JS numbers, and creating a modern, dense dashboard featuring concurrent Bar and Line Charts.

## Goals / Non-Goals

**Goals:**
- Implement print-ready, clean invoice/receipt downloads.
- Fix Next.js client component serialization crashes on database Decimal fields.
- Show three separate charts on the dashboard: 6-month Revenue Bar Chart, MoM Line Chart, and YoY Line Chart.
- Set all currency formatting to Omani Rial `ر.ع.` prefix and restrict to 2 decimal places.
- Maximize layout density and eliminate grid empty columns on the dashboard.

**Non-Goals:**
- Automated online credit card gateways.
- Advanced payroll integration.
- CMS course content builders.

## Decisions

### 1. Implement download via route handlers returning semantic print-ready HTML
To print clean, professional tax invoices/receipts, we expose a download endpoint returning structured print-optimized HTML. This is more lightweight than PDF rendering libraries and allows default browser printer engines to format pages perfectly.

### 2. Standardize JSON serialization for Prisma Decimals
Instead of spreading Prisma objects (`...inv`), we serialize arrays using `JSON.parse(JSON.stringify(invoices))` before passing them to client tables. This strips class prototypes and custom `Decimal` properties, which cause Next.js server-to-client boundary crashes.

### 3. Split MoM and YoY trends into two separate Line Charts
Rather than using a toggle tab that hides comparative trends, we show both line charts concurrently. This provides instant visibility into both daily monthly comparisons (MoM) and monthly annual comparisons (YoY).

### 4. Compact the grid and interleave cards to eliminate whitespace
By pairing `col-span-2` charts side-by-side with `col-span-1` pie charts and moving corporate clients to a full-width block at the bottom, we ensure that every row fills the 3-column CSS Grid. Reducing spacing values (gaps, padding, container heights) further compresses vertical scrolling footprint.

## Risks / Trade-offs

- [Risk] Custom browser print configurations could distort HTML invoice designs. → Mitigation: use standard CSS print stylesheets (`@media print`) and flex layouts to keep documents single-page.
- [Risk] Decimal conversion rounding errors. → Mitigation: format strictly via `.toFixed(2)` and typecast using standard `Number()`.
