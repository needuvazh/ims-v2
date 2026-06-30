'use client';

import { useActionState } from 'react';
import type { SecurityPolicy } from '@ims/identity-access';
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Checkbox, Alert } from '@ims/shared-ui';
import { updateSecurityPolicyAction, type SecurityPolicyState } from './actions';

const initialState: SecurityPolicyState = {};

export function SecurityPolicyForm({ policy }: { policy: SecurityPolicy }) {
  const [state, formAction, isPending] = useActionState(updateSecurityPolicyAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit security policy</CardTitle>
        <CardDescription>Update login, lockout, password, and session policy values.</CardDescription>
      </CardHeader>
      <form action={formAction} noValidate>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {state.error ? <Alert variant="error" description={state.error} className="md:col-span-2" /> : null}
          <Input name="maxFailedAttempts" type="number" label="Max failed attempts" defaultValue={state.values?.maxFailedAttempts !== undefined ? String(state.values.maxFailedAttempts) : String(policy.maxFailedAttempts ?? '')} />
          <Input name="lockoutDurationMinutes" type="number" label="Lockout duration (minutes)" defaultValue={state.values?.lockoutDurationMinutes !== undefined ? String(state.values.lockoutDurationMinutes) : String(policy.lockoutDurationMinutes ?? '')} />
          <Input name="passwordMinLength" type="number" label="Password min length" defaultValue={state.values?.passwordMinLength !== undefined ? String(state.values.passwordMinLength) : String(policy.passwordMinLength ?? '')} />
          <Input name="passwordHistoryCount" type="number" label="Password history count" defaultValue={state.values?.passwordHistoryCount !== undefined ? String(state.values.passwordHistoryCount) : String(policy.passwordHistoryCount ?? '')} />
          <Input name="passwordExpiryDays" type="number" label="Password expiry days" defaultValue={state.values?.passwordExpiryDays !== undefined ? String(state.values.passwordExpiryDays) : String(policy.passwordExpiryDays ?? '')} />
          <Input name="resetTokenExpiryMinutes" type="number" label="Reset token expiry minutes" defaultValue={state.values?.resetTokenExpiryMinutes !== undefined ? String(state.values.resetTokenExpiryMinutes) : String(policy.resetTokenExpiryMinutes ?? '')} />
          <Input name="accessTokenExpiryMinutes" type="number" label="Access token expiry minutes" defaultValue={state.values?.accessTokenExpiryMinutes !== undefined ? String(state.values.accessTokenExpiryMinutes) : String(policy.accessTokenExpiryMinutes ?? '')} />
          <Input name="refreshTokenExpiryDays" type="number" label="Refresh token expiry days" defaultValue={state.values?.refreshTokenExpiryDays !== undefined ? String(state.values.refreshTokenExpiryDays) : String(policy.refreshTokenExpiryDays ?? '')} />
          <Input name="rememberMeRefreshTokenDays" type="number" label="Remember me refresh days" defaultValue={state.values?.rememberMeRefreshTokenDays !== undefined ? String(state.values.rememberMeRefreshTokenDays) : String(policy.rememberMeRefreshTokenDays ?? '')} />
          <Input name="sessionInactivityMinutes" type="number" label="Session inactivity minutes" defaultValue={state.values?.sessionInactivityMinutes !== undefined ? String(state.values.sessionInactivityMinutes) : String(policy.sessionInactivityMinutes ?? '')} />
          <Input name="maxConcurrentSessions" type="number" label="Max concurrent sessions" defaultValue={state.values?.maxConcurrentSessions !== undefined ? String(state.values.maxConcurrentSessions) : String(policy.maxConcurrentSessions ?? '')} />
          <div className="space-y-3 md:col-span-2">
            <Checkbox name="passwordRequireUppercase" label="Require uppercase characters" defaultChecked={state.values ? (state.values.passwordRequireUppercase === 'on' || state.values.passwordRequireUppercase === 'true' || state.values.passwordRequireUppercase === true) : Boolean(policy.passwordRequireUppercase)} />
            <Checkbox name="passwordRequireLowercase" label="Require lowercase characters" defaultChecked={state.values ? (state.values.passwordRequireLowercase === 'on' || state.values.passwordRequireLowercase === 'true' || state.values.passwordRequireLowercase === true) : Boolean(policy.passwordRequireLowercase)} />
            <Checkbox name="passwordRequireNumbers" label="Require numbers" defaultChecked={state.values ? (state.values.passwordRequireNumbers === 'on' || state.values.passwordRequireNumbers === 'true' || state.values.passwordRequireNumbers === true) : Boolean(policy.passwordRequireNumbers)} />
            <Checkbox name="passwordRequireSpecial" label="Require special characters" defaultChecked={state.values ? (state.values.passwordRequireSpecial === 'on' || state.values.passwordRequireSpecial === 'true' || state.values.passwordRequireSpecial === true) : Boolean(policy.passwordRequireSpecial)} />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" loading={isPending}>Save policy</Button>
        </CardFooter>
      </form>
    </Card>
  );
}
