---
name: ims-document-verification
description: Handle IMS document types, uploads, verification status, signed access, and document-related rules for students, staff, and certificates. Use for document intake, verification, or secure file access changes.
---

# IMS Document Verification

Use this skill when IMS needs document upload, review, or secure access behavior.

## What to determine

1. Document type and owning context.
2. Whether the file is required, optional, or conditionally required.
3. Upload metadata, verification status, and reviewer action.
4. How the file is stored and served securely.

## Rules

- Do not expose raw storage URLs directly to the client.
- Prefer signed or controlled access.
- Keep document verification auditable.
- Validate identity-related document requirements at the boundary and in the domain rule.
- Do not let document payloads leak into unrelated aggregates.

## Output

Return:

- document type
- verification workflow
- access policy
- audit event
- tests for upload, access, approval, and rejection

