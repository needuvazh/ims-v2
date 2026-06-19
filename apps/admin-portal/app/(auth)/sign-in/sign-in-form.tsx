'use client';

import { useActionState } from 'react';
import { Alert, Button, Input } from '@ims/shared-ui';
import { signInAction, type SignInState } from './actions';

const initialState: SignInState = {};

export function SignInForm() {
  const [state, formAction, isPending] = useActionState(signInAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--ims-paper)] p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--ims-muted)]">
            Al-Saud Training Institute
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display,serif)] text-4xl font-semibold tracking-tight text-[color:var(--ims-ink)]">
            Admin Portal
          </h1>
          <p className="mt-1 text-sm text-[color:var(--ims-muted)]">
            Sign in to manage your institute
          </p>
        </div>

        <div className="rounded-[32px] border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-8 shadow-[0_18px_50px_rgba(17,24,39,0.08)]">
          <form action={formAction} className="space-y-5">
            {state.error && (
              <Alert variant="error" description={state.error} data-testid="sign-in-error" />
            )}

            <Input
              name="email"
              type="email"
              label="Email address"
              placeholder="admin@example.com"
              autoComplete="email"
              required
              data-testid="sign-in-email"
            />

            <Input
              name="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              data-testid="sign-in-password"
            />

            <Button
              type="submit"
              loading={isPending}
              className="w-full"
              data-testid="sign-in-submit"
            >
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[color:var(--ims-muted)]">
          IMS v2 · Secure admin access only
        </p>
      </div>
    </div>
  );
}
