# Migration: user_sessions_previous_token_hash

## Description
Adds refresh-token rotation support to `user_sessions`.

## Mitigation/Rollback Notes
- This migration is additive only.
- Rollback removes `previousTokenHash` and its index.
