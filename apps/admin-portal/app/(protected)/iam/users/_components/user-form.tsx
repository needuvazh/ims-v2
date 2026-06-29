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
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  nationalId?: string | null;
  nationality?: string | null;
  dateOfBirth?: Date | null;
  gender?: string | null;
  status?: string;
  userType?: string; // Legacy
  effectiveStartDate?: Date | null;
  effectiveEndDate?: Date | null;
  roleIds?: string[];
  branchIds?: string[];
  defaultBranchId?: string | null;
};

const initialState: ActionResult = { success: false };

export interface IamUserFormProps {
  mode: 'create' | 'edit' | 'view';
  initialData?: UserProfile;
  roles: Array<{ id: string; roleName: string }>;
  branches: Array<{ id: string; branchName: string }>;
}

function toDateInputValue(value?: Date | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

export function IamUserForm({ mode, initialData, roles, branches }: IamUserFormProps) {
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
    if (state.fieldErrors) setFieldErrors(state.fieldErrors);
  }, [state.fieldErrors]);

  useEffect(() => {
    if (state.success) setFieldErrors({});
  }, [state.success]);

  const isView = mode === 'view';

  // State for selections
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(
    new Set(initialData?.roleIds ?? [])
  );
  const [selectedBranchIds, setSelectedBranchIds] = useState<Set<string>>(
    new Set(initialData?.branchIds ?? [])
  );
  const [defaultBranch, setDefaultBranch] = useState<string>(
    initialData?.defaultBranchId ?? ''
  );

  return (
    <form action={formAction} noValidate className="space-y-8 bg-[color:var(--ims-surface)] p-6 rounded-2xl border border-[color:var(--ims-border)]">
      {state.error && !state.fieldErrors && <Alert variant="error" description={state.error} />}
      
      {/* 1. Personal Information */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-[color:var(--ims-ink)]">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            name="firstName" 
            label="First Name" 
            required 
            defaultValue={initialData?.firstName}
            disabled={isView}
            errorText={fieldErrors.firstName}
          />
          <Input 
            name="lastName" 
            label="Last Name" 
            required 
            defaultValue={initialData?.lastName}
            disabled={isView}
            errorText={fieldErrors.lastName}
          />
          <Input 
            name="email" 
            type="email" 
            label="Email" 
            required 
            defaultValue={initialData?.email}
            disabled={isView || mode === 'edit'}
            errorText={fieldErrors.email}
          />
          <Input 
            name="mobile" 
            label="Mobile Number" 
            required
            defaultValue={initialData?.mobile ?? ''}
            disabled={isView}
            errorText={fieldErrors.mobile}
          />
          <Input 
            name="nationalId" 
            label="National ID" 
            defaultValue={initialData?.nationalId ?? ''}
            disabled={isView}
            errorText={fieldErrors.nationalId}
          />
          <Input 
            name="nationality" 
            label="Nationality" 
            defaultValue={initialData?.nationality ?? ''}
            disabled={isView}
            errorText={fieldErrors.nationality}
          />
          <Input
            name="dateOfBirth"
            type="date"
            label="Date of Birth"
            defaultValue={toDateInputValue(initialData?.dateOfBirth)}
            disabled={isView}
            errorText={fieldErrors.dateOfBirth}
          />
          <Select
            name="gender"
            label="Gender"
            placeholder="Select gender"
            defaultValue={initialData?.gender ?? ''}
            options={[
              { value: 'Male', label: 'Male' },
              { value: 'Female', label: 'Female' },
            ]}
            disabled={isView}
            errorText={fieldErrors.gender}
          />
        </div>
      </section>

      {/* 2. Account & Lifecycle */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-[color:var(--ims-ink)]">Account Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            name="status"
            label="Initial Status"
            placeholder="Select status"
            defaultValue={initialData?.status ?? 'PendingActivation'}
            options={[
              { value: 'PendingActivation', label: 'Pending Activation' },
              { value: 'Active', label: 'Active' },
            ]}
            required
            disabled={isView || mode === 'edit'}
            errorText={fieldErrors.status}
          />
          <Select
            name="userType"
            label="Legacy User Type"
            placeholder="Select type"
            defaultValue={initialData?.userType ?? 'Student'}
            options={[
              { value: 'Admin', label: 'System Administrator' },
              { value: 'BranchManager', label: 'Branch Manager' },
              { value: 'Counselor', label: 'Counselor' },
              { value: 'Trainer', label: 'Trainer' },
              { value: 'Accountant', label: 'Accountant' },
              { value: 'AcademicCoordinator', label: 'Academic Coordinator' },
              { value: 'Management', label: 'Management' },
              { value: 'Owner', label: 'Owner' },
              { value: 'Student', label: 'Student' },
            ]}
            required
            disabled={isView}
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
      </section>

      {/* 3. Roles */}
      <section className="space-y-4 rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-background)] p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[color:var(--ims-ink)]">Role Assignment</h3>
          <p className="text-xs text-[color:var(--ims-muted)]">Select at least one role to define what actions this user can perform.</p>
        </div>
        {fieldErrors.roleIds && <p className="text-sm text-red-500">{fieldErrors.roleIds}</p>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {roles.map((role) => (
            <label key={role.id} className="flex items-start gap-3 rounded-xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-3 cursor-pointer">
              <Checkbox
                name="roleIds"
                value={role.id}
                disabled={isView}
                checked={selectedRoleIds.has(role.id)}
                onChange={(e) => {
                  const newSet = new Set(selectedRoleIds);
                  if (e.target.checked) newSet.add(role.id);
                  else newSet.delete(role.id);
                  setSelectedRoleIds(newSet);
                }}
                className="mt-1"
              />
              <span className="text-sm font-medium text-[color:var(--ims-ink)]">{role.roleName}</span>
            </label>
          ))}
        </div>
      </section>

      {/* 4. Branches */}
      <section className="space-y-4 rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-background)] p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[color:var(--ims-ink)]">Branch Scope</h3>
          <p className="text-xs text-[color:var(--ims-muted)]">Select at least one branch for this user, and set their default branch.</p>
        </div>
        {fieldErrors.branchIds && <p className="text-sm text-red-500">{fieldErrors.branchIds}</p>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {branches.map((branch) => (
            <label key={branch.id} className="flex items-start gap-3 rounded-xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-3 cursor-pointer">
              <Checkbox
                name="branchIds"
                value={branch.id}
                disabled={isView}
                checked={selectedBranchIds.has(branch.id)}
                onChange={(e) => {
                  const newSet = new Set(selectedBranchIds);
                  if (e.target.checked) newSet.add(branch.id);
                  else newSet.delete(branch.id);
                  setSelectedBranchIds(newSet);
                  if (!newSet.has(defaultBranch)) {
                    setDefaultBranch('');
                  }
                }}
                className="mt-1"
              />
              <span className="text-sm font-medium text-[color:var(--ims-ink)]">{branch.branchName}</span>
            </label>
          ))}
        </div>

        {selectedBranchIds.size > 0 && (
          <div className="mt-4 border-t border-[color:var(--ims-border)] pt-4">
            <Select
              name="defaultBranchId"
              label="Default Branch"
              placeholder="Select default branch"
              value={defaultBranch}
              onChange={(e) => setDefaultBranch(e.target.value)}
              disabled={isView}
              required
              errorText={fieldErrors.defaultBranchId}
              options={branches
                .filter((b) => selectedBranchIds.has(b.id))
                .map((b) => ({ value: b.id, label: b.branchName }))}
            />
          </div>
        )}
      </section>

      {!isView && (
        <div className="flex justify-end gap-3 pt-4 border-t border-[color:var(--ims-border)]">
          <Button type="button" variant="secondary" onClick={() => router.push('/iam/users')}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
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
