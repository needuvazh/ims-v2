'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Save } from 'lucide-react';
import {
  Alert,
  Button,
  Checkbox,
  Input,
  Select,
} from '@ims/shared-ui';
import { createUserAction, updateUserAction, type ActionResult } from '../actions';

type UserProfile = {
  id: string;
  fullName?: string;
  email?: string;
  phone?: string | null;
  status?: string;
  userType?: string;
  effectiveStartDate?: Date | null;
  effectiveEndDate?: Date | null;
  dataScopes?: Array<{ scopeType: string; branchId?: string | null; assignedOnly?: boolean }>;
};

const initialState: ActionResult = { success: false };

export interface UserFormProps {
  mode: 'create' | 'edit' | 'view';
  initialData?: UserProfile;
  branches: Array<{ id: string; branchName: string }>;
}

function toDateInputValue(value?: Date | null) {
  if (!value) return '';
  return value.toISOString().slice(0, 10);
}

export function UserForm({ mode, initialData, branches }: UserFormProps) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = mode === 'edit' && initialData
        ? await updateUserAction(initialData.id, prev, formData)
        : await createUserAction(prev, formData);
      if (result.success) {
        router.push('/iam/users');
      }
      return result;
    },
    initialState,
  );

  useEffect(() => {
    if (state.fieldErrors) {
      setFieldErrors(state.fieldErrors);
    }
  }, [state.fieldErrors]);

  useEffect(() => {
    if (state.success) {
      setFieldErrors({});
    }
  }, [state.success]);

  const isView = mode === 'view';
  const selectedBranchIds = new Set((initialData?.dataScopes ?? [])
    .filter((scope: { scopeType: string; branchId?: string | null }) => scope.scopeType === 'Branch' && scope.branchId)
    .map((scope: { branchId?: string | null }) => scope.branchId as string));
  const assignedOnly = initialData?.dataScopes?.some((scope: { scopeType: string; assignedOnly?: boolean }) => scope.scopeType === 'Branch' && scope.assignedOnly) ?? false;

  return (
    <form action={formAction} noValidate className="space-y-6 bg-[color:var(--ims-surface)] p-6 rounded-2xl border border-[color:var(--ims-border)]">
      {state.error && !state.fieldErrors && <Alert variant="error" description={state.error} />}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input 
          name="fullName" 
          label="Full Name" 
          placeholder="Fatima Al-Saud" 
          required 
          defaultValue={initialData?.fullName}
          disabled={isView}
          data-testid="user-name-input" 
          errorText={fieldErrors.fullName}
        />
        <Input 
          name="email" 
          type="email" 
          label="Email" 
          placeholder="fatima@institute.com" 
          required 
          defaultValue={initialData?.email}
          disabled={isView || mode === 'edit'}
          data-testid="user-email-input" 
          errorText={fieldErrors.email}
        />
        <Input 
          name="phone" 
          label="Phone" 
          placeholder="+966 xx xxxx xxxx" 
          defaultValue={initialData?.phone ?? ''}
          disabled={isView}
          errorText={fieldErrors.phone}
        />
        <Select
          name="status"
          label="Status"
          placeholder="Select status"
          defaultValue={initialData?.status ?? 'PendingActivation'}
          options={[
            { value: 'PendingActivation', label: 'Pending Activation' },
            { value: 'Active', label: 'Active' },
            { value: 'Locked', label: 'Locked' },
            { value: 'Suspended', label: 'Suspended' },
            { value: 'Archived', label: 'Archived' },
          ]}
          required
          disabled={isView}
          data-testid="user-status-select"
          errorText={fieldErrors.status}
        />
        {mode === 'create' && (
          <Input 
            name="password" 
            type="password" 
            label="Password" 
            placeholder="Min 8 characters" 
            required 
            disabled={isView}
            data-testid="user-password-input" 
            errorText={fieldErrors.password}
          />
        )}
        <Select
          name="userType"
          label="User Type"
          placeholder="Select type"
          defaultValue={initialData?.userType}
          options={[
            { value: 'Admin', label: 'System Administrator' },
            { value: 'BranchManager', label: 'Branch Manager' },
            { value: 'Counselor', label: 'Counselor' },
            { value: 'Trainer', label: 'Trainer' },
            { value: 'Accountant', label: 'Accountant' },
            { value: 'AcademicCoordinator', label: 'Academic Coordinator' },
            { value: 'Management', label: 'Management' },
            { value: 'Owner', label: 'Owner' },
          ]}
          required
          disabled={isView}
          data-testid="user-type-select"
          errorText={fieldErrors.userType}
        />
        <Input
          name="effectiveStartDate"
          type="date"
          label="Effective Start Date"
          defaultValue={toDateInputValue(initialData?.effectiveStartDate)}
          disabled={isView}
          errorText={fieldErrors.effectiveStartDate}
        />
        <Input
          name="effectiveEndDate"
          type="date"
          label="Effective End Date"
          defaultValue={toDateInputValue(initialData?.effectiveEndDate ?? null)}
          disabled={isView}
          errorText={fieldErrors.effectiveEndDate}
        />
      </div>

      <div className="space-y-4 rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-background)] p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[color:var(--ims-ink)]">Branch Scope</h3>
          <p className="text-xs text-[color:var(--ims-muted)]">
            Select the branches this user can access. Leave empty only for Owner or Management users with global scope.
          </p>
        </div>

        {isView ? (
          <div className="flex flex-wrap gap-2">
            {(initialData?.dataScopes ?? []).some((scope: { scopeType: string }) => scope.scopeType === 'All') ? (
              <span className="rounded-full border border-[color:var(--ims-border)] px-3 py-1 text-xs font-medium text-[color:var(--ims-ink)]">
                All Branches
              </span>
            ) : (
              branches
                .filter((branch) => selectedBranchIds.has(branch.id))
                .map((branch) => (
                  <span key={branch.id} className="rounded-full border border-[color:var(--ims-border)] px-3 py-1 text-xs font-medium text-[color:var(--ims-ink)]">
                    {branch.branchName}
                  </span>
                ))
            )}
            {assignedOnly ? (
              <span className="rounded-full border border-[color:var(--ims-border)] px-3 py-1 text-xs font-medium text-[color:var(--ims-ink)]">
                Assigned Only
              </span>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {branches.map((branch) => (
              <label key={branch.id} className="flex items-start gap-3 rounded-xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-3">
                <Checkbox
                  name="branchIds"
                  value={branch.id}
                  defaultChecked={selectedBranchIds.has(branch.id)}
                  className="mt-1"
                />
                <span className="text-sm font-medium text-[color:var(--ims-ink)]">{branch.branchName}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {!isView && (
        <Checkbox
          name="assignedOnly"
          label="Assigned only"
          description="Limit branch access to assigned records."
          defaultChecked={assignedOnly}
        />
      )}

      {!isView && (
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={() => router.push('/iam/users')}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending} data-testid="user-submit-btn">
            {mode === 'create' ? (
              <><UserPlus className="h-4 w-4 mr-2" /> Create User</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> Save Changes</>
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
