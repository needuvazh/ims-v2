'use client';

import { useActionState, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Save } from 'lucide-react';
import {
  Alert,
  Button,
  Checkbox,
  Input,
  Select,
} from '@ims/shared-ui';
import { createUserAction, updateUserAction, checkEmailExistsAction, checkMobileExistsAction, type ActionResult } from '../actions';
import { createUserFormSchema, updateUserFormSchema } from '../schema';

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
  const formRef = useRef<HTMLFormElement>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateField = async (name: string) => {
    if (!formRef.current) return true;
    const formData = new FormData(formRef.current);

    const roleIds = formData.getAll('roleIds').map((value) => String(value)).filter((value) => value.trim() !== '');
    const branchIds = formData.getAll('branchIds').map((value) => String(value)).filter((value) => value.trim() !== '');

    const payload: any = {
      firstName: formData.get('firstName') ? String(formData.get('firstName')) : '',
      lastName: formData.get('lastName') ? String(formData.get('lastName')) : '',
      mobile: formData.get('mobile') ? String(formData.get('mobile')) : '',
      nationalId: formData.get('nationalId') ? String(formData.get('nationalId')) : null,
      nationality: formData.get('nationality') ? String(formData.get('nationality')) : null,
      dateOfBirth: formData.get('dateOfBirth') && String(formData.get('dateOfBirth')) !== '' ? String(formData.get('dateOfBirth')) : null,
      gender: formData.get('gender') ? String(formData.get('gender')) : null,
      status: String(formData.get('status') ?? 'PendingActivation'),
      roleIds,
      branchIds,
      defaultBranchId: formData.get('defaultBranchId') ? String(formData.get('defaultBranchId')) : null,
      effectiveStartDate: formData.get('effectiveStartDate') && String(formData.get('effectiveStartDate')) !== '' ? String(formData.get('effectiveStartDate')) : null,
      effectiveEndDate: formData.get('effectiveEndDate') && String(formData.get('effectiveEndDate')) !== '' ? String(formData.get('effectiveEndDate')) : null,
    };

    if (mode === 'create') {
      payload.email = formData.get('email') ? String(formData.get('email')) : '';
    }

    console.log(`[validateField] validating field: ${name}`, { payload });

    const schema = mode === 'edit' ? updateUserFormSchema : createUserFormSchema;
    const validation = schema.safeParse(payload);

    // Clear error for this field first
    setFieldErrors((prev) => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });

    if (!validation.success) {
      const issue = validation.error.issues.find((issue) => issue.path[0] === name);
      if (issue) {
        console.log(`[validateField] Zod validation issue found for ${name}:`, issue.message);
        setFieldErrors((prev) => ({
          ...prev,
          [name]: issue.message,
        }));
        return false;
      }
    }

    // Async check duplicate email
    if (name === 'email' && mode === 'create') {
      const emailVal = payload.email.trim();
      if (emailVal) {
        console.log(`[validateField] checking duplicate email: ${emailVal}`);
        const exists = await checkEmailExistsAction(emailVal);
        console.log(`[validateField] email exists result: ${exists}`);
        if (exists) {
          setFieldErrors((prev) => ({
            ...prev,
            email: 'Email already exists. Please use a different email address.',
          }));
          return false;
        }
      }
    }

    // Async check duplicate mobile
    if (name === 'mobile') {
      const mobileVal = payload.mobile.trim();
      const isDifferent = mode === 'create' || mobileVal !== (initialData?.mobile ?? '');
      if (mobileVal && isDifferent) {
        console.log(`[validateField] checking duplicate mobile: ${mobileVal}`);
        const exists = await checkMobileExistsAction(mobileVal);
        console.log(`[validateField] mobile exists result: ${exists}`);
        if (exists) {
          setFieldErrors((prev) => ({
            ...prev,
            mobile: 'Mobile number already exists. Please use a different mobile number.',
          }));
          return false;
        }
      }
    }

    return true;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const name = e.target.name;
    if (name) {
      validateField(name);
    }
  };

  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      // 1. Client-side validation
      const roleIds = formData.getAll('roleIds').map((value) => String(value)).filter((value) => value.trim() !== '');
      const branchIds = formData.getAll('branchIds').map((value) => String(value)).filter((value) => value.trim() !== '');
      
      const payload: any = {
        firstName: formData.get('firstName') ? String(formData.get('firstName')) : '',
        lastName: formData.get('lastName') ? String(formData.get('lastName')) : '',
        mobile: formData.get('mobile') ? String(formData.get('mobile')) : '',
        nationalId: formData.get('nationalId') ? String(formData.get('nationalId')) : null,
        nationality: formData.get('nationality') ? String(formData.get('nationality')) : null,
        dateOfBirth: formData.get('dateOfBirth') && String(formData.get('dateOfBirth')) !== '' ? String(formData.get('dateOfBirth')) : null,
        gender: formData.get('gender') ? String(formData.get('gender')) : null,
        status: String(formData.get('status') ?? 'PendingActivation'),
        roleIds,
        branchIds,
        defaultBranchId: formData.get('defaultBranchId') ? String(formData.get('defaultBranchId')) : null,
        effectiveStartDate: formData.get('effectiveStartDate') && String(formData.get('effectiveStartDate')) !== '' ? String(formData.get('effectiveStartDate')) : null,
        effectiveEndDate: formData.get('effectiveEndDate') && String(formData.get('effectiveEndDate')) !== '' ? String(formData.get('effectiveEndDate')) : null,
      };

      if (mode === 'create') {
        payload.email = formData.get('email') ? String(formData.get('email')) : '';
      }

      const schema = mode === 'edit' ? updateUserFormSchema : createUserFormSchema;
      const validation = schema.safeParse(payload);
      const errors: Record<string, string> = {};

      if (!validation.success) {
        console.warn('Client-side form validation failed!', {
          payload,
          issues: validation.error.issues,
        });
        validation.error.issues.forEach((issue) => {
          const path = issue.path[0];
          if (path && !errors[String(path)]) {
            errors[String(path)] = issue.message;
          }
        });
      }

      // Check duplicate email
      if (mode === 'create' && payload.email && !errors.email) {
        const exists = await checkEmailExistsAction(payload.email.trim());
        if (exists) {
          errors.email = 'Email already exists. Please use a different email address.';
        }
      }

      // Check duplicate mobile
      if (payload.mobile && !errors.mobile) {
        const mobileVal = payload.mobile.trim();
        const isDifferent = mode === 'create' || mobileVal !== (initialData?.mobile ?? '');
        if (isDifferent) {
          const exists = await checkMobileExistsAction(mobileVal);
          if (exists) {
            errors.mobile = 'Mobile number already exists. Please use a different mobile number.';
          }
        }
      }

      if (Object.keys(errors).length > 0) {
        // Repopulate values
        const values: Record<string, string> = {};
        formData.forEach((value, key) => {
          if (values[key]) {
            values[key] = `${values[key]},${value.toString()}`;
          } else {
            values[key] = value.toString();
          }
        });

        return {
          success: false,
          error: 'Please fix validation errors.',
          fieldErrors: errors,
          values,
        };
      }

      // 2. Submit to server Action
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

  // State for selections
  const getInitialRoles = () => {
    if (state?.values?.roleIds !== undefined) {
      return new Set(state.values.roleIds ? state.values.roleIds.split(',').filter(Boolean) : []);
    }
    return new Set(initialData?.roleIds ?? []);
  };

  const getInitialBranches = () => {
    if (state?.values?.branchIds !== undefined) {
      return new Set(state.values.branchIds ? state.values.branchIds.split(',').filter(Boolean) : []);
    }
    return new Set(initialData?.branchIds ?? []);
  };

  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(getInitialRoles);
  const [selectedBranchIds, setSelectedBranchIds] = useState<Set<string>>(getInitialBranches);
  const [defaultBranch, setDefaultBranch] = useState<string>(() => {
    if (state?.values?.defaultBranchId !== undefined) {
      return state.values.defaultBranchId;
    }
    return initialData?.defaultBranchId ?? '';
  });

  useEffect(() => {
    if (state?.values) {
      const rolesArr = state.values.roleIds ? state.values.roleIds.split(',').filter(Boolean) : [];
      setSelectedRoleIds(new Set(rolesArr));
      
      const branchesArr = state.values.branchIds ? state.values.branchIds.split(',').filter(Boolean) : [];
      setSelectedBranchIds(new Set(branchesArr));
      
      setDefaultBranch(state.values.defaultBranchId ?? '');
    }
  }, [state?.values]);

  useEffect(() => {
    if (state.fieldErrors) setFieldErrors(state.fieldErrors);
  }, [state.fieldErrors]);

  useEffect(() => {
    if (state.success) setFieldErrors({});
  }, [state.success]);

  const isView = mode === 'view';

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-8">
      {state.error && <Alert variant="error" description={state.error} />}
      
      {/* 1. Personal Information */}
      <div className="bg-[color:var(--ims-surface)] rounded-2xl border border-[color:var(--ims-border)] overflow-hidden shadow-sm">
        <div className="relative h-32 overflow-hidden bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900">
          <img 
            src="/images/personal_info_header.jpg" 
            className="w-full h-full object-cover opacity-70 absolute inset-0 mix-blend-overlay" 
            alt="Personal Information Banner" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-955/80 via-slate-955/20 to-transparent flex items-end p-6">
            <div>
              <h3 className="text-xl font-bold text-white tracking-wide">Personal Information</h3>
              <p className="text-xs text-slate-200 opacity-90">Basic user profile details</p>
            </div>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            name="firstName" 
            label="First Name" 
            required 
            defaultValue={state.values?.firstName ?? initialData?.firstName}
            disabled={isView}
            errorText={fieldErrors.firstName}
            onBlur={handleBlur}
          />
          <Input 
            name="lastName" 
            label="Last Name" 
            required 
            defaultValue={state.values?.lastName ?? initialData?.lastName}
            disabled={isView}
            errorText={fieldErrors.lastName}
            onBlur={handleBlur}
          />
          <Input 
            name="email" 
            type="email" 
            label="Email" 
            required 
            defaultValue={state.values?.email ?? initialData?.email}
            disabled={isView || mode === 'edit'}
            errorText={fieldErrors.email}
            onBlur={handleBlur}
          />
          <Input 
            name="mobile" 
            label="Mobile Number" 
            required
            defaultValue={state.values?.mobile ?? initialData?.mobile ?? ''}
            disabled={isView}
            errorText={fieldErrors.mobile}
            onBlur={handleBlur}
          />
          <Input 
            name="nationalId" 
            label="National ID" 
            defaultValue={state.values?.nationalId ?? initialData?.nationalId ?? ''}
            disabled={isView}
            errorText={fieldErrors.nationalId}
            onBlur={handleBlur}
          />
          <Input 
            name="nationality" 
            label="Nationality" 
            defaultValue={state.values?.nationality ?? initialData?.nationality ?? ''}
            disabled={isView}
            errorText={fieldErrors.nationality}
            onBlur={handleBlur}
          />
          <Input
            name="dateOfBirth"
            type="date"
            label="Date of Birth"
            defaultValue={state.values?.dateOfBirth ? toDateInputValue(new Date(state.values.dateOfBirth)) : toDateInputValue(initialData?.dateOfBirth)}
            disabled={isView}
            errorText={fieldErrors.dateOfBirth}
            onBlur={handleBlur}
          />
          <Select
            name="gender"
            label="Gender"
            placeholder="Select gender"
            defaultValue={state.values?.gender ?? initialData?.gender ?? ''}
            options={[
              { value: 'Male', label: 'Male' },
              { value: 'Female', label: 'Female' },
            ]}
            disabled={isView}
            errorText={fieldErrors.gender}
            onValueChange={() => {
              setTimeout(() => validateField('gender'), 0);
            }}
          />
        </div>
      </div>

      {/* 2. Account Settings */}
      <div className="bg-[color:var(--ims-surface)] rounded-2xl border border-[color:var(--ims-border)] overflow-hidden shadow-sm">
        <div className="relative h-32 overflow-hidden bg-gradient-to-r from-amber-800 via-orange-900 to-rose-955">
          <img 
            src="/images/account_settings_header.jpg" 
            className="w-full h-full object-cover opacity-70 absolute inset-0 mix-blend-overlay" 
            alt="Account Settings Banner" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-955/80 via-slate-955/20 to-transparent flex items-end p-6">
            <div>
              <h3 className="text-xl font-bold text-white tracking-wide">Account Settings</h3>
              <p className="text-xs text-slate-200 opacity-90">Password and status configurations</p>
            </div>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            name="status"
            label="Initial Status"
            placeholder="Select status"
            defaultValue={state.values?.status ?? initialData?.status ?? 'PendingActivation'}
            options={[
              { value: 'PendingActivation', label: 'Pending Activation' },
              { value: 'Active', label: 'Active' },
            ]}
            required
            disabled={isView || mode === 'edit'}
            errorText={fieldErrors.status}
            onValueChange={() => {
              setTimeout(() => validateField('status'), 0);
            }}
          />
          <Input
            name="effectiveStartDate"
            type="date"
            label="Effective Start Date"
            defaultValue={state.values?.effectiveStartDate ? toDateInputValue(new Date(state.values.effectiveStartDate)) : toDateInputValue(initialData?.effectiveStartDate)}
            disabled={isView}
            errorText={fieldErrors.effectiveStartDate}
            onBlur={handleBlur}
          />
          <Input
            name="effectiveEndDate"
            type="date"
            label="Effective End Date"
            defaultValue={state.values?.effectiveEndDate ? toDateInputValue(new Date(state.values.effectiveEndDate)) : toDateInputValue(initialData?.effectiveEndDate ?? null)}
            disabled={isView}
            errorText={fieldErrors.effectiveEndDate}
            onBlur={handleBlur}
          />
        </div>
      </div>

      {/* 3. Role Assignment */}
      <div className="bg-[color:var(--ims-surface)] rounded-2xl border border-[color:var(--ims-border)] overflow-hidden shadow-sm">
        <div className="relative h-32 overflow-hidden bg-gradient-to-r from-emerald-900 via-teal-900 to-cyan-955">
          <img 
            src="/images/role_assignment_header.jpg" 
            className="w-full h-full object-cover opacity-70 absolute inset-0 mix-blend-overlay" 
            alt="Role Assignment Banner" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-955/80 via-slate-955/20 to-transparent flex items-end p-6">
            <div>
              <h3 className="text-xl font-bold text-white tracking-wide">Role Assignment</h3>
              <p className="text-xs text-slate-200 opacity-90">Configure security roles and policies</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {fieldErrors.roleIds && <p className="text-sm text-red-500 font-medium">{fieldErrors.roleIds}</p>}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {roles.map((role) => (
              <label key={role.id} className="flex items-start gap-3 rounded-xl border border-[color:var(--ims-border)] bg-[color:var(--ims-background)] p-4 cursor-pointer hover:bg-[color:var(--ims-border)]/20 transition-colors">
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
                    setTimeout(() => validateField('roleIds'), 0);
                  }}
                  className="mt-1"
                />
                <span className="text-sm font-medium text-[color:var(--ims-ink)]">{role.roleName}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Branch Scope */}
      <div className="bg-[color:var(--ims-surface)] rounded-2xl border border-[color:var(--ims-border)] overflow-hidden shadow-sm">
        <div className="relative h-32 overflow-hidden bg-gradient-to-r from-rose-900 via-pink-900 to-purple-955">
          <img 
            src="/images/branch_scope_header.jpg" 
            className="w-full h-full object-cover opacity-70 absolute inset-0 mix-blend-overlay" 
            alt="Branch Scope Banner" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-955/80 via-slate-955/20 to-transparent flex items-end p-6">
            <div>
              <h3 className="text-xl font-bold text-white tracking-wide">Branch Scope</h3>
              <p className="text-xs text-slate-200 opacity-90">Define access boundaries and default locations</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {fieldErrors.branchIds && <p className="text-sm text-red-500 font-medium">{fieldErrors.branchIds}</p>}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {branches.map((branch) => (
              <label key={branch.id} className="flex items-start gap-3 rounded-xl border border-[color:var(--ims-border)] bg-[color:var(--ims-background)] p-4 cursor-pointer hover:bg-[color:var(--ims-border)]/20 transition-colors">
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
                    setTimeout(() => {
                      validateField('branchIds');
                      validateField('defaultBranchId');
                    }, 0);
                  }}
                  className="mt-1"
                />
                <span className="text-sm font-medium text-[color:var(--ims-ink)]">{branch.branchName}</span>
              </label>
            ))}
          </div>

          {selectedBranchIds.size > 0 && (
            <div className="mt-4 border-t border-[color:var(--ims-border)]/50 pt-4">
              <Select
                name="defaultBranchId"
                label="Default Branch"
                placeholder="Select default branch"
                value={defaultBranch}
                disabled={isView}
                required
                errorText={fieldErrors.defaultBranchId}
                options={branches
                  .filter((b) => selectedBranchIds.has(b.id))
                  .map((b) => ({ value: b.id, label: b.branchName }))}
                onValueChange={(val) => {
                  setDefaultBranch(val);
                  setTimeout(() => validateField('defaultBranchId'), 0);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {!isView && (
        <div className="flex justify-end gap-3 pt-6 border-t border-[color:var(--ims-border)]/50">
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
