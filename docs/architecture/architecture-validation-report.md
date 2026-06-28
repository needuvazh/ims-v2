# Architecture Validation Report

## ASTI IMS Review Response

**Status:** Draft / Applied to documentation  
**Date:** 2026-06-28

## 1. Summary

The architecture evaluation identified gaps around Corporate B2B credit control, bilingual data modeling, Oman document expiry compliance, offline biometric sync, Tally ERP reliability, and documentation consistency.

The current workspace copies of BRD, ARD, NFR, project status, and Organization APIs are readable. The documentation has still been updated because several reviewed requirements were missing, underspecified, or incorrectly treated only as future items.

## 2. Validation Matrix

| Area | Gap | Applied documentation fix |
| --- | --- | --- |
| B2B corporate credit and invoicing | Corporate accounts lacked explicit credit invariant and billing coordination | Added Corporate Training credit rules to BRD, context map v2, and domain model v2 |
| Bilingual EN/AR support | Localization existed as NFR but not as data model policy | Added LocalizedText policy and JSON/table guidance |
| Oman document expiry and alerts | Document expiry was present but compliance hold behavior was not explicit | Added compliance document aggregate, expiry worker rules, and NFR targets |
| Offline biometric sync | Attendance docs did not fully specify edge buffering and idempotency | Added architecture v2 and domain model sync event requirements |
| Tally ERP sync | Integration existed as a future reference without dual-write protections | Added outbox/retry/reconciliation requirements |
| Branch-scoped data isolation | Present, but review required stronger enforcement wording | Reaffirmed server-side branch scoping and UI hiding prohibition |

## 3. Reconstructed / Added Documents

| Document | Purpose |
| --- | --- |
| `docs/architecture/architecture-v2.md` | Review-aligned architecture blueprint |
| `docs/architecture/ddd/ddd-context-map-v2.md` | Bounded context map with Corporate, Compliance, Biometric, and Tally boundaries |
| `docs/architecture/ddd/domain-model-v2.md` | Domain model additions for credit, documents, localized text, biometric events, and Tally sync |
| `docs/architecture/architecture-validation-report.md` | Traceability from review findings to documentation updates |

## 4. Open Decisions

1. Corporate credit failures: hard block or approval override?
2. Tally sync cadence: near-real-time event push or daily batch reconciliation?
3. Biometric infrastructure: ASTI-provided local server or project-delivered gateway client?
4. Arabic search: which localized fields require indexed full-text search?
