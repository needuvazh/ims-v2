# Migration: user_roles_lifecycle_fields

## Description
Adds the IAM user-role lifecycle columns required by the current Prisma schema.

## Mitigation/Rollback Notes
- This migration is additive only.
- Rollback removes the added lifecycle columns from `user_roles`.
