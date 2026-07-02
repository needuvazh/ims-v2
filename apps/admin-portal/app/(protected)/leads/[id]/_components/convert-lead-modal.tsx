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

type ConvertFormData = z.input<typeof ConvertLeadSchema>;

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
      documents: [
        {
          fileName: '',
          fileKey: '',
          fileType: 'application/pdf',
          documentType: 'CIVIL_ID_FRONT',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'documents',
  });

  const onSubmit = async (data: ConvertFormData) => {
    try {
      setIsSubmitting(true);
      const payload = {
        documents: data.documents.map((doc) => {
          const fileName = doc.fileName || doc.fileKey.split('/').pop() || 'document.pdf';
          return {
            ...doc,
            fileName,
          };
        }),
      };

      const res = await fetch(`/api/v1/crm/leads/${leadId}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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
              <FormLabel>Required Identity Documents</FormLabel>
              <p className="text-xs text-[color:var(--ims-muted)]">
                Provide the type and URL/path for the required handoff documents.
              </p>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {fields.map((field, index) => (
                  <FormField key={field.id}>
                    <div className="space-y-2 border p-3 rounded-lg bg-gray-50/50">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500">Document #{index + 1}</span>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            disabled={isSubmitting}
                            className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Document Type</label>
                          <select
                            {...register(`documents.${index}.documentType`)}
                            disabled={isSubmitting}
                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50"
                          >
                            <option value="CIVIL_ID_FRONT">Civil ID Front</option>
                            <option value="CIVIL_ID_BACK">Civil ID Back</option>
                            <option value="PASSPORT_SCAN">Passport Scan</option>
                            <option value="ACADEMIC_TRANSCRIPT">Academic Transcript</option>
                            <option value="SPONSORSHIP_LETTER">Sponsorship Letter</option>
                            <option value="OTHER">Other</option>
                          </select>
                          <FormError>{errors?.documents?.[index]?.documentType?.message}</FormError>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">File URL / Key</label>
                          <FormControl>
                            <Input
                              {...register(`documents.${index}.fileKey`)}
                              placeholder="https://example.com/civil.pdf"
                              disabled={isSubmitting}
                              className="mt-1 text-xs h-8"
                            />
                          </FormControl>
                          <FormError>{errors?.documents?.[index]?.fileKey?.message}</FormError>
                        </div>
                      </div>
                    </div>
                  </FormField>
                ))}
              </div>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 text-xs border-dashed"
                onClick={() => append({ fileName: '', fileKey: '', fileType: 'application/pdf', documentType: 'CIVIL_ID_FRONT' })}
                disabled={isSubmitting}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Another Document
              </Button>
            </div>

            <FormError>{errors.documents?.message}</FormError>

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
