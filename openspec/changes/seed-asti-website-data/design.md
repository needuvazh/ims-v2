## Context

The `packages/database/prisma/seed.ts` file acts as the primary data seeding entry point, run via `pnpm seed` or automatically on database reset. The current script sets up a headquarters in Riyadh, Saudi Arabia, and maps mock IT courses. We are modifying this to map the actual Muscat, Oman headquarters and branch contact details as described on the `alsaud-intl.com` website, along with 6 safety training and crane operation courses.

## Goals / Non-Goals

**Goals:**
* Clear any existing database records cleanly before seeding new data to avoid duplicate key conflicts (e.g., using `deleteMany`).
* Update the `Institute` seed record to reflect Al-Saud Training Institute in Muscat, Oman.
* Configure `AST-MUSCAT` as the main headquarters branch and `AST-RIYADH` as a secondary campus.
* Create a new category `CAT-VOC` (Vocational & Safety Training) and populate the 6 safety courses (`MECH-FLOP`, `MECH-FL-END`, `MECH-TMC`, `MECH-OGC`, `MECH-EWP`, `MECH-OTH`).
* Map course banner images to the `/alsaud/courses/*.jpg` relative public URLs.
* Maintain the `CS-FSWD` and other mock IT courses under the `AST-RIYADH` campus to preserve unit/integration test compatibility.

**Non-Goals:**
* Modifying database migrations or the schema in `schema.prisma`.
* Changing front-end components, layouts, or static pages in the `admin-portal` app.
* Integrating real payment gateways or third-party SMS/WhatsApp APIs.

## Decisions

* **Database Cleanup Order**: We will perform cascades/deletions in the correct order (relying on relations cleanups like deleting `coursePricing`, `courseCompletionRule`, and `course` before `courseCategory`, etc.) to prevent foreign key violations.
* **Image Referencing**: We will use local paths `/alsaud/courses/` for the banner images in the database since the relevant images are already present in the public assets directory.
* **Muscat Staff Symmetries**: We will add a counselor (`counselor.muscat@ims.com`) and accountant (`accountant.muscat@ims.com`) for the Muscat branch so that branch-scoped RBAC testing can cover Muscat comprehensively.

## Risks / Trade-offs

* **Test Regressions**: If any integration test checks for a specific course list or the default branch of the admin user, changing the seed data could cause issues.
  * *Mitigation*: We will keep all mock IT courses (`CS-FSWD` etc.) active under the `CAT-TECH` category, and maintain `AST-RIYADH` as a fully configured branch.
