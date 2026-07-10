## 1. Clean Database Seeding Setup

- [x] 1.1 Ensure all database tables (`CourseCategory`, `Course`, `Branch`, `Institute`, `UserBranchAccess`, `UserRole`, `User`, `Person`) are cleaned up at the beginning of the seed.
- [x] 1.2 Cascade delete dependencies like pricing, completion rules, and permissions correctly.

## 2. Seed Institute, Branch, Department, Category

- [x] 2.1 Seed ASTI headquarters in Muscat, Oman, with correct website, email, phone, and address.
- [x] 2.2 Seed Muscat Campus (`AST-MUSCAT`) and Riyadh Campus (`AST-RIYADH`) branches.
- [x] 2.3 Add `AST-MUSCAT-VOC` ("Vocational & Safety Training") department under Muscat.
- [x] 2.4 Seed `CAT-VOC` ("Vocational & Safety Training" / "التدريب المهني والسلامة") course category.

## 3. Seed Safety Courses

- [x] 3.1 Seed 6 specific heavy machinery and safety courses matching website data under `CAT-VOC`.
- [x] 3.2 For each safety course, seed `CoursePricing` (Individual/Regular, base price 150.0).
- [x] 3.3 For each safety course, seed `CourseCompletionRule` (minimum 100% attendance).

## 4. Symmetrical Branch Users

- [x] 4.1 Create counselor (`counselor.muscat@ims.com`) and accountant (`accountant.muscat@ims.com`) users for Muscat branch.
- [x] 4.2 Assign roles and branch accesses correctly.

## 5. Verification

- [x] 5.1 Run `pnpm --filter @ims/database seed` to apply seeds.
- [x] 5.2 Run `pnpm typecheck` to verify no compilation regressions.
- [x] 5.3 Run `pnpm test` to verify the tests still pass.
