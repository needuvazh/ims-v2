## 1. Document Generation and Actions

- [x] 1.1 Add download icons inline to invoice rows under the Actions section of the Invoices Catalog table.
- [x] 1.2 Implement the route handler `/api/v1/finance/invoices/[id]/download/route.ts` to fetch invoice metadata, payer associations, and linked payment receipts.
- [x] 1.3 Format invoices to display Omani tax invoice structure, branch-specific contact information, payer profiles, subtotal, tax, discounts, paid amount, and outstanding balances.

## 2. Serialization & Decimal Conversion

- [x] 2.1 Refactor Prisma `findUnique` to `findFirst` to correctly support non-uniquely indexed columns and soft delete scoping.
- [x] 2.2 Correct `payments` relation queries to match the single-relation `receipt` structure in `schema.prisma`.
- [x] 2.3 Convert all database-fetched Prisma Decimals to JavaScript numbers using JSON parse/stringify on both the Main Finance Dashboard and the Invoices Index pages.

## 3. Visualization and Dashboard Customization

- [x] 3.1 Prefix all currency fields with `ر.ع.` and restrict decimals to 2 precision digits (.00).
- [x] 3.2 Add the original 6-month Bar Chart for general revenue trends.
- [x] 3.3 Create and display two separate Line Charts comparing Current vs Previous Month (MoM, daily series) and Current vs Previous Year (YoY, monthly series).

## 4. Spacing and Grid Layout Optimization

- [x] 4.1 Reduce vertical and grid container gaps (`space-y-8` to `space-y-4` and `gap-6` to `gap-4`).
- [x] 4.2 Restructure layout ordering to interleave `col-span-2` and `col-span-1` cards to prevent empty cells.
- [x] 4.3 Compact chart container heights from `h-80` to `h-64`.
