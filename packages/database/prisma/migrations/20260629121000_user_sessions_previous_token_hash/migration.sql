-- Add refresh-token rotation tracking for user sessions.
ALTER TABLE "user_sessions"
ADD COLUMN "previousTokenHash" TEXT;

CREATE INDEX "user_sessions_previousTokenHash_idx" ON "user_sessions"("previousTokenHash");
