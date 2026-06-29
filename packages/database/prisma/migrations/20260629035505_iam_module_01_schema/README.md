# Migration: iam_module_01_schema

## Description
This migration implements the Prisma schema changes for the IAM Module 01 implementation.

## Mitigation/Rollback Notes
- Data Loss Warnings: The schema removes the `Draft` and `Inactive` values from the `UserStatus` enum. If these were in use, the values are lost in PostgreSQL on migration. In case of rollback, any rows migrated to new values might need manual review if downgrading.
- Unique Constraints: New unique constraints were added for `personId`, `username`, and `email` on the `users` table.
- A new `Person` table is introduced and linked to `User`. The application code must be updated to insert a `Person` whenever a `User` is created.
- Rollback: Reverting this migration involves dropping the new tables (`user_branch_access`, `password_history`, `user_activation_tokens`, `security_policies`, `notifications`, `export_jobs`) and reversing the field alterations on `users`, `audit_logs`, `login_history`, and `roles`. No automatic down-migration is provided by Prisma. Run `prisma migrate resolve --rolled-back` and manually drop the tables in PostgreSQL if needed.
