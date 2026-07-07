# Course Configurations & Overrides Design

This document details the architectural layout, UI data binding, and endpoint implementations for the course catalog configuration upgrades.

## Database Schema Modifications

Extends the Prisma `Course` model to support public details, syllabus content, and SEO meta tags:

```prisma
model Course {
  // ... existing fields
  isPubliclyExposed          Boolean   @default(false)
  bannerImage                String?
  metaTitle                  String?
  metaDescription            String?
  metaKeywords               String?
  syllabusOutline            String?
  showPricingPublicly        Boolean   @default(true)
  hasPracticalInstruction    Boolean   @default(false)
  practicalTestingDescription String?
}
```

## REST API Specification

### 1. Fee Pricing Overrides (`/api/v1/courses/[id]/pricing`)
- **GET**: Accepts query parameters (`page`, `limit`, `status`, `branchId`, `sortBy`, `sortOrder`). Performs count query and returns paginated list of pricing records.
- **PATCH**: Accepts `{ id, action: 'disable' }`. Invokes `disablePricing` service to mark status as `Inactive`.

### 2. Discount segment Overrides (`/api/v1/courses/[id]/discounts`)
- **GET**: Accepts query parameters (`page`, `limit`, `status`, `branchId`, `sortBy`, `sortOrder`, `q`). Returns matching paginated list of discounts.
- **PATCH**: Accepts `{ id, action: 'disable' }`. Invokes `disableDiscount` to toggle status to `Inactive`.

### 3. Graduation Completion Rules (`/api/v1/courses/[id]/completion-rules`)
- **GET**: Accepts query parameters (`page`, `limit`, `status`, `sortBy`, `sortOrder`). Returns paginated rules list.
- **PATCH**: Accepts `{ id, action: 'disable' }`. Invokes `disableCompletionRule` to mark rules version as `Inactive`.

## UI Components & State Machine

### 1. Multi-Select Target Branches Selectors
Utilizes the searchable `MultiSelect` popover checkbox list in the Pricing and Discount forms. The form handles bulk insertion by mapping the selected branch list and submitting sequential POST requests to the server, hardcoding `batchId` to `null`.

### 2. Configs Panel Datatables
Integrates the `ResponsiveDataTable` and `Pagination` components under each configuration tab. Page, search queries, status filters, and sorting parameters are bound to isolated URL search parameters to preserve grid states across page reloads:
- **Pricing**: `pricePage`, `priceBranchId`, `priceStatus`, `priceSortBy`, `priceSortOrder`
- **Discounts**: `discountPage`, `discountBranchId`, `discountStatus`, `discountSortBy`, `discountSortOrder`, `discountQ`
- **Rules**: `rulePage`, `ruleStatusFilter`, `ruleSortBy`, `ruleSortOrder`

### 3. Graduation Checks Input Selector Card
Renders a `bg-slate-50 border border-slate-200/60 rounded-xl` wrapper containing label list buttons with custom description texts for:
- Exam / Assessment Passing
- Financial Balance Clearance
- Academic Director Approval

### 4. Next.js Image and Icons Serialization Normalizer
- **Image URL Normalizer**: Normalizes course imageUrl paths. Invalid external urls fallback to placeholder icons, and local relative paths are automatically prefixed with a leading slash `/` to prevent Next.js image loader crashes.
- **SVG Serialization**: Passes serializable string names inside the stats object to Client Components. The Client-side `HeroSection` resolves keys (e.g. `'clock'`, `'shield'`) to standard Lucide React components using an internal map dictionary.
