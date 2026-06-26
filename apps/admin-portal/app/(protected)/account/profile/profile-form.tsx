'use client';

import { useActionState } from 'react';
import { Alert, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input } from '@ims/shared-ui';
import { updateProfileAction, type UpdateProfileState } from './actions';

const initialState: UpdateProfileState = {};

export interface ProfileFormProps {
  user: {
    fullName: string;
    email: string;
    phone: string | null;
    userType: string;
    status: string;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, initialState);

  if (state.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile updated</CardTitle>
          <CardDescription>Your profile changes were saved successfully.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="success" description="Email stays unchanged. Use Change Password for login security updates." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Profile</CardTitle>
        <CardDescription>Update your personal details. Email address is read-only and cannot be changed here.</CardDescription>
      </CardHeader>

      <form action={formAction} noValidate className="space-y-6">
        <CardContent className="space-y-5">
          {state.error ? <Alert variant="error" description={state.error} /> : null}

          <Input
            name="fullName"
            label="Full name"
            required
            defaultValue={user.fullName}
            autoComplete="name"
            helperText="This is the display name used across the portal."
          />
          <Input
            name="email"
            label="Email address"
            defaultValue={user.email}
            disabled
            helperText="Managed by your administrator."
          />
          <Input
            name="phone"
            label="Phone"
            defaultValue={user.phone ?? ''}
            autoComplete="tel"
            helperText="Optional contact number."
          />

          <div className="grid gap-3 rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-background)] p-4 text-sm md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--ims-muted)]">User type</p>
              <p className="mt-1 font-medium text-[color:var(--ims-ink)]">{user.userType}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--ims-muted)]">Status</p>
              <p className="mt-1 font-medium text-[color:var(--ims-ink)]">{user.status}</p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-end gap-3">
          <Button type="submit" loading={isPending}>Save profile</Button>
        </CardFooter>
      </form>
    </Card>
  );
}
