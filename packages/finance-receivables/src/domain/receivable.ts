import { z } from 'zod';

export const ReceivableStatusSchema = z.enum([
  'Open',
  'PartiallyPaid',
  'Overdue',
  'Settled',
  'WrittenOff'
]);

export type ReceivableStatus = z.infer<typeof ReceivableStatusSchema>;

export const UpdateReceivableStatusInputSchema = z.object({
  id: z.string().uuid(),
  status: ReceivableStatusSchema
});

export type UpdateReceivableStatusInput = z.infer<typeof UpdateReceivableStatusInputSchema>;
