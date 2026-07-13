## Why

The current local development database is seeded with mock IT courses (like Full Stack Web Development) located in a Riyadh, Saudi Arabia headquarters. As Al Saud Training Institute (ASTI) is a real-world vocational safety training center based in Muscat, Oman, we need to seed the database with their actual course catalog, headquarters location, Omani contact coordinates, and Omani branches. This ensures that the local environment matches the production requirements.

We will also ensure that any existing master data affected by this seed update is cleared before insertion to prevent duplication or primary key conflicts.

## What Changes

1. **Clean up existing seed records**: Update the seed cleanup routine to safely delete existing `CourseCategory`, `Course`, `Branch`, `Institute`, and user profiles matching Muscat or Riyadh scopes.
2. **Seed real ASTI HQ data**: Update the `Institute` seed record to represent Al-Saud Training Institute in Muscat, Oman, with email `contactus@alsaud-intl.com`, phone `+96896589150`, website `https://www.alsaud-intl.com/`, and address `AZAIBA NORTH, AL ANWAR STREET, BUILDING NO. 648`.
3. **Seed Muscat Campus HQ branch**: Define `AST-MUSCAT` as the primary headquarters campus, providing proper address and contact details.
4. **Seed Muscat Vocational & Safety Department**: Seed department `AST-MUSCAT-VOC` under Muscat branch.
5. **Seed Vocational Course Category**: Create course category `CAT-VOC` ("Vocational & Safety Training" / "التدريب المهني والسلامة").
6. **Seed 6 Real ASTI safety courses**: Register the courses extracted from `https://www.alsaud-intl.com/` (Forklift Operator, Forklift Endorsement, Truck Mounted Crane, Overhead Gantry Crane, Elevated Work Platforms, and Other Courses/Mini Crawler Crane) with their English/Arabic names, description details, and banner image paths `/alsaud/courses/*.jpg`.
7. **Create Muscat Staff Accounts**: Add Muscat-specific Trainer, Counselor, and Accountant users.
8. **Keep existing compatibility courses**: Retain the mock coding courses under `CAT-TECH` so that existing integration/unit tests do not break.

## Capabilities

### New Capabilities
None. This is a configuration/database seeding change.

### Modified Capabilities
None. The database models, schemas, and API contracts remain unmodified.

## Impact

* **Bounded Contexts**: Configuration / Master Data, Organization Management, Course Catalog.
* **Database Package**: `packages/database/prisma/seed.ts`.
* **Testing**: Integration tests in `@ims/course-catalog` will pass because mock courses (`CS-FSWD`) are retained.
* **Audit and Compliance**: Soft delete rules and creation/deletion logs in seed execution are respected.
