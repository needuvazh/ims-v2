'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
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
  Input,
  Textarea,
  Select,
  FormField,
  FormLabel,
  FormControl,
  FormError,
  Checkbox,
} from '@ims/shared-ui';
const clientOutcomeSchema = z.object({
  outcome: z.enum(['Answered', 'Busy', 'SwitchedOff', 'NoResponse', 'NotInterested', 'Interested', 'VisitScheduled']),
  outcomeNotes: z.string().min(15, 'Outcome notes must contain conversation detail'),
  scheduleNext: z.boolean(),
  version: z.number().int('Optimistic concurrency version required'),
  nextFollowUpDate: z.string().optional().nullable(),
  nextFollowUpType: z.enum(['Call', 'WhatsApp', 'Email', 'Visit']).optional().nullable(),
  nextFollowUpAgenda: z.string().max(250).optional().nullable(),
}).refine((data) => {
  if (data.scheduleNext) {
    if (!data.nextFollowUpDate || !data.nextFollowUpType || !data.nextFollowUpAgenda) {
      return false;
    }
    return new Date(data.nextFollowUpDate).getTime() > Date.now() + 300000;
  }
  return true;
}, {
  message: 'Next follow-up details are mandatory and must be scheduled at least 5 minutes in the future',
  path: ['nextFollowUpDate'],
});

type OutcomeFormData = z.infer<typeof clientOutcomeSchema>;

interface LogFollowUpModalProps {
  followUpId: string;
  leadVersion: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogFollowUpModal({
  followUpId,
  leadVersion,
  isOpen,
  onOpenChange,
}: LogFollowUpModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<OutcomeFormData>({
    resolver: zodResolver(clientOutcomeSchema),
    defaultValues: {
      outcome: 'Answered',
      outcomeNotes: '',
      scheduleNext: false,
      version: leadVersion,
    },
  });

  const scheduleNext = watch('scheduleNext');

  const onSubmit = async (data: OutcomeFormData) => {
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/v1/crm/leads/follow-ups/${followUpId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate).toISOString() : null,
          version: leadVersion,
        }),
      });

      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.messageEnglish || 'Failed to log outcome');
      }

      toast.success('Follow-up outcome logged successfully');
      router.refresh();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to log outcome');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) reset();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            Log Follow-Up Outcome
          </DialogTitle>
          <DialogDescription>
            Record the outcome of this follow-up interaction.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <FormField>
            <FormLabel htmlFor="outcome">Outcome</FormLabel>
            <FormControl>
              <Select
                id="outcome"
                value={watch('outcome')}
                onChange={(e) => register('outcome').onChange(e)}
                ref={register('outcome').ref}
                name="outcome"
                options={[
                  { value: 'Answered', label: 'Answered' },
                  { value: 'Busy', label: 'Busy' },
                  { value: 'SwitchedOff', label: 'Switched Off' },
                  { value: 'NoResponse', label: 'No Response' },
                  { value: 'NotInterested', label: 'Not Interested' },
                  { value: 'Interested', label: 'Interested' },
                  { value: 'VisitScheduled', label: 'Visit Scheduled' },
                ]}
                disabled={isSubmitting}
                className="w-full"
              />
            </FormControl>
            <FormError>{errors.outcome?.message}</FormError>
          </FormField>

          <FormField>
            <FormLabel htmlFor="outcomeNotes">Outcome Notes (Min 15 chars)</FormLabel>
            <FormControl>
              <Textarea
                id="outcomeNotes"
                {...register('outcomeNotes')}
                disabled={isSubmitting}
                placeholder="Discussed course details..."
                rows={3}
              />
            </FormControl>
            <FormError>{errors.outcomeNotes?.message}</FormError>
          </FormField>

          <div className="border-t border-[color:var(--ims-border)] pt-4 mt-4">
            <FormField className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Controller
                  name="scheduleNext"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      name={field.name}
                      ref={field.ref}
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      disabled={isSubmitting}
                    />
                  )}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Schedule Next Follow-Up</FormLabel>
                <p className="text-sm text-[color:var(--ims-muted)]">
                  Automatically create a new scheduled follow-up for this lead.
                </p>
              </div>
            </FormField>
          </div>

          {scheduleNext && (
            <div className="space-y-4 bg-[color:var(--ims-surface-hover)] p-4 rounded-md">
              <div className="grid grid-cols-2 gap-4">
                <FormField>
                  <FormLabel htmlFor="nextFollowUpDate">Date & Time</FormLabel>
                  <FormControl>
                    <Input
                      id="nextFollowUpDate"
                      type="datetime-local"
                      {...register('nextFollowUpDate')}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormError>{errors.nextFollowUpDate?.message}</FormError>
                </FormField>

                <FormField>
                  <FormLabel htmlFor="nextFollowUpType">Type</FormLabel>
                  <FormControl>
                    <Select
                      id="nextFollowUpType"
                      value={watch('nextFollowUpType') || ''}
                      onChange={(e) => register('nextFollowUpType').onChange(e)}
                      ref={register('nextFollowUpType').ref}
                      name="nextFollowUpType"
                      options={[
                        { value: '', label: '-- Select Type --' },
                        { value: 'Call', label: 'Call' },
                        { value: 'WhatsApp', label: 'WhatsApp' },
                        { value: 'Email', label: 'Email' },
                        { value: 'Visit', label: 'Visit' },
                      ]}
                      disabled={isSubmitting}
                      className="w-full"
                    />
                  </FormControl>
                  <FormError>{errors.nextFollowUpType?.message}</FormError>
                </FormField>
              </div>

              <FormField>
                <FormLabel htmlFor="nextFollowUpAgenda">Agenda (Max 250 chars)</FormLabel>
                <FormControl>
                  <Textarea
                    id="nextFollowUpAgenda"
                    {...register('nextFollowUpAgenda')}
                    disabled={isSubmitting}
                    placeholder="Agenda for the next touchpoint..."
                    rows={2}
                  />
                </FormControl>
                <FormError>{errors.nextFollowUpAgenda?.message}</FormError>
              </FormField>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Log Outcome'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
