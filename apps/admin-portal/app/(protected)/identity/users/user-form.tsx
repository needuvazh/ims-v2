'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Save } from 'lucide-react';
import {
  Alert,
  Button,
  Input,
  Select,
} from '@ims/shared-ui';
import type { UserRecord } from '@ims/identity-access';
import { createUserAction, type ActionResult } from '../actions';

const initialState: ActionResult = { success: false };

export interface UserFormProps {
  mode: 'create' | 'edit' | 'view';
  initialData?: UserRecord;
}

export function UserForm({ mode, initialData }: UserFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      // In a real app, you would have an updateUserAction for edit mode
      const result = await createUserAction(prev, formData);
      if (result.success) {
        router.push('/identity/users');
      }
      return result;
    },
    initialState,
  );

  const isView = mode === 'view';

  return (
    <form action={formAction} className="space-y-6 bg-[color:var(--ims-surface)] p-6 rounded-2xl border border-[color:var(--ims-border)]">
      {state.error && <Alert variant="error" description={state.error} />}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input 
          name="fullName" 
          label="Full Name" 
          placeholder="Fatima Al-Saud" 
          required 
          defaultValue={initialData?.fullName}
          disabled={isView}
          data-testid="user-name-input" 
        />
        <Input 
          name="email" 
          type="email" 
          label="Email" 
          placeholder="fatima@institute.com" 
          required 
          defaultValue={initialData?.email}
          disabled={isView}
          data-testid="user-email-input" 
        />
        <Input 
          name="phone" 
          label="Phone" 
          placeholder="+966 xx xxxx xxxx" 
          defaultValue={initialData?.phone ?? ''}
          disabled={isView}
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
          />
        )}
        <Select
          name="userType"
          label="User Type"
          placeholder="Select type"
          defaultValue={initialData?.userType}
          options={[
            { value: 'SuperAdmin', label: 'Super Admin' },
            { value: 'InstituteAdmin', label: 'Institute Admin' },
            { value: 'Trainer', label: 'Trainer' },
            { value: 'Staff', label: 'Staff' },
          ]}
          required
          disabled={isView}
          data-testid="user-type-select"
        />
      </div>

      {!isView && (
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={() => router.push('/identity/users')}>
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
