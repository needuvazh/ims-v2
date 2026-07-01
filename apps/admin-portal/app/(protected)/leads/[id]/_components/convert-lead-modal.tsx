'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { LogIn, Plus, Trash2 } from 'lucide-react';
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
  FormField,
  FormLabel,
  FormControl,
  FormError,
} from '@ims/shared-ui';
import { ConvertLeadSchema } from '@ims/crm-leads';

type ConvertFormData = z.infer<typeof ConvertLeadSchema>;

interface ConvertLeadModalProps {
  leadId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  hasMissingPreconditions: boolean;
}

export function ConvertLeadModal({
  leadId,
  isOpen,
  onOpenChange,
  hasMissingPreconditions,
}: ConvertLeadModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ConvertFormData>({
    resolver: zodResolver(ConvertLeadSchema),
    defaultValues: {
      documentLinks: [''], // Start with one empty input
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'documentLinks' as never,
  });

  const onSubmit = async (data: ConvertFormData) => {
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/v1/crm/leads/${leadId}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.messageEnglish || 'Failed to convert lead');
      }

      toast.success('Lead converted to Admission successfully!');
      router.refresh();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to convert lead');
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
            <LogIn className="h-5 w-5 text-green-600" />
            Convert Lead to Admission
          </DialogTitle>
          <DialogDescription>
            This action will mark the lead as &quot;Converted&quot; and create a student profile in the Admissions module.
          </DialogDescription>
        </DialogHeader>

        {hasMissingPreconditions ? (
          <div className="py-4 text-red-600 text-sm font-medium">
            Cannot convert lead. Please ensure the lead has a valid Email and Date of Birth in their profile before converting.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="space-y-3">
              <FormLabel>Identity Documents (Required)</FormLabel>
              <p className="text-xs text-[color:var(--ims-muted)]">
                Please provide URLs to the scanned Civil ID or Passport documents.
              </p>
              
              {fields.map((field, index) => (
                <FormField key={field.id}>
                  <div className="flex gap-2 items-start">
                    <div className="flex-1">
                      <FormControl>
                        <Input
                          {...register(`documentLinks.${index}`)}
                          placeholder="https://example.com/document.pdf"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormError>{errors?.documentLinks?.[index]?.message}</FormError>
                    </div>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => remove(index)}
                        disabled={isSubmitting}
                        className="shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </FormField>
              ))}
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => append('')}
                disabled={isSubmitting}
              >
                <Plus className="h-3 w-3 mr-1" /> Add Document Link
              </Button>
            </div>

            <FormError>{errors.documentLinks?.message}</FormError>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white">
                {isSubmitting ? 'Converting...' : 'Convert to Admission'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
