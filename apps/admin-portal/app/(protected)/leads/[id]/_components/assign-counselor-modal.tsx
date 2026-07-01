'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { UserCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@ims/shared-ui';
import {
  Button,
  Select,
  FormField,
  FormLabel,
  FormControl,
  FormError,
} from '@ims/shared-ui';

const assignCounselorSchema = z.object({
  counselorId: z.string().uuid('Please select a valid counselor'),
});

type AssignFormData = z.infer<typeof assignCounselorSchema>;

interface AssignCounselorModalProps {
  leadId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  counselors: Array<{ id: string; name: string }>;
  currentCounselorId?: string | null;
}

export function AssignCounselorModal({
  leadId,
  isOpen,
  onOpenChange,
  counselors,
  currentCounselorId,
}: AssignCounselorModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<AssignFormData>({
    resolver: zodResolver(assignCounselorSchema),
    defaultValues: {
      counselorId: currentCounselorId || '',
    },
  });

  const onSubmit = async (data: AssignFormData) => {
    if (data.counselorId === currentCounselorId) {
      onOpenChange(false);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/v1/crm/leads/${leadId}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.messageEnglish || 'Failed to assign counselor');
      }

      toast.success('Counselor assigned successfully');
      router.refresh();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign counselor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) reset();
      onOpenChange(open);
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-[color:var(--ims-brand)]" />
            Assign Counselor
          </DialogTitle>
          <DialogDescription>
            Assign this lead to a counselor. Any pending follow-ups will be automatically reassigned.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <FormField>
            <FormLabel htmlFor="counselorId">Select Counselor</FormLabel>
            <FormControl>
              <Select
                id="counselorId"
                value={watch('counselorId')}
                onChange={(e) => register('counselorId').onChange(e)}
                ref={register('counselorId').ref}
                name="counselorId"
                options={[
                  { value: '', label: '-- Select a Counselor --' },
                  ...counselors.map((c) => ({ value: c.id, label: c.name })),
                ]}
                disabled={isSubmitting}
                className="w-full"
              />
            </FormControl>
            <FormError>{errors.counselorId?.message}</FormError>
          </FormField>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
