'use client';

import { useActionState } from 'react';
import { ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Alert, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input } from '@ims/shared-ui';
import { changePasswordAction, type ChangePasswordState } from './actions';

const initialState: ChangePasswordState = {};

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePasswordAction, initialState);

  if (state.success) {
    return (
      <Card className="border-[color:var(--ims-brass-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,248,240,0.96))]">
        <CardHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--ims-brass-soft)] text-[color:var(--ims-brass)]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle>Password updated</CardTitle>
          <CardDescription>
            Your new password is active now. All other sessions for this account were signed out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert
            variant="success"
            description="Keep your updated password private. If you did not make this change, contact your administrator immediately."
          />
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--ims-brass)] hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-full bg-[color:var(--ims-ink)] px-5 text-sm font-medium text-[color:var(--ims-paper)] shadow-[0_4px_14px_rgba(20,33,61,0.25)] transition-all hover:bg-[color:var(--ims-brass)]"
          >
            Continue
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--ims-accent-soft)] text-[color:var(--ims-brass)]">
          <KeyRound className="h-6 w-6" />
        </div>
        <CardTitle>Change password</CardTitle>
        <CardDescription>
          Confirm your current password, then choose a new one. The portal will keep your current session active.
        </CardDescription>
      </CardHeader>

      <form action={formAction} noValidate className="space-y-6">
        <CardContent className="space-y-5">
          {state.error ? <Alert variant="error" description={state.error} /> : null}

          <Input
            name="currentPassword"
            type="password"
            label="Current password"
            autoComplete="current-password"
            required
            minLength={1}
            helperText="Use the password you sign in with today."
          />
          <Input
            name="newPassword"
            type="password"
            label="New password"
            autoComplete="new-password"
            required
            minLength={8}
            helperText="Use at least 8 characters with upper, lower, number, and symbol."
          />
          <Input
            name="confirmPassword"
            type="password"
            label="Confirm new password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </CardContent>

        <CardFooter className="justify-end gap-3">
          <Button type="submit" loading={isPending}>
            Update password
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
