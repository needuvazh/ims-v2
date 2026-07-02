## Context

Document evidence is required by admission and enrollment flows, but the actual document lifecycle belongs to the Documents context. This change defines the database schema and cross-context boundaries to consume document status safely without leaking access or breaking existing crm/admission transaction boundaries.

## Goals / Non-Goals

**Goals:**
- Define type-safe database schema for the Documents context (`Document`, `DocumentOwner`, and `DocumentVerification` models).
- Persist `branchId` directly on the `Document` record to ensure robust, leak-proof branch scoping.
- Redesign the lead conversion input contract using a structured `DocumentCaptureInput` DTO instead of raw URL strings.
- Orchestrate document registration in the same database transaction as lead conversion using the Documents context application service.
- Make lead-to-admission handoff idempotent, reusing existing `Person` and `StudentProfile` records to match the module-04 specification.
- Separate physical document lifecycle states from administrative verification outcomes.
- Define a document requirements resolver that evaluates course-level overrides and branch rules.

**Non-Goals:**
- Changing certificate or finance document workflows.

## Decisions

- **Strict Explicit Ownership Model:** Implement a dedicated `DocumentOwner` mapping model in the database to bind documents to parent entities (`Person`, `StudentProfile`, `Admission`, `Enrollment`). Avoid free-form string properties for ownership linking to ensure foreign key constraint integrity.
- **Persisted Branch Scoping:** Avoid dynamic resolution of branches from callers or active workflows. The `Document` model will store a `branchId` attribute directly. The branch context is resolved and validated on upload and persisted on the document, ensuring authorization checks query the record's stored context.
- **Redesigned Lead-Conversion Contract:** Upgrade `ConvertLeadSchema` to accept structured document metadata (file keys, file names, document types, and file types) rather than raw URL strings.
- **Transactional Orchestration:** The `LeadConversionOrchestrator` will call the Documents context's `registerDocuments` service synchronously inside the interactive database transaction, passing the transaction client.
- **Idempotency in Admission Service:** Update `AdmissionService` and the database repository helper to reuse existing `Person` and `StudentProfile` records if a profile already exists for the email/mobile, avoiding transition errors.
- **Gate Semantics Split:** 
  - *Document Lifecycle State:* `Draft`, `Active`, `Expired`, `Replaced`, `Deleted`.
  - *Verification Outcome:* `Pending`, `Verified`, `Rejected`.
  - *Resolver Precedence:* Course-level required document types override branch-level defaults.

## Risks / Trade-offs

- [Risk] Duplicate records if lead conversion is rerun. → Mitigation: Handoff idempotency checks for existing documents with matching file keys before creating duplicates.
- [Risk] Branch leakage when identity document is uploaded at the Person level. → Mitigation: Persisting the branch of the active workflow that requested the upload on the document. Users from other branches cannot access the document unless they are authorized for the stored branch.
- [Risk] DB schema complexity from mapping tables. → Mitigation: Accept a small footprint increase for type safety and constraint enforcement.
