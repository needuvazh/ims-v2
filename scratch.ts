import { z } from 'zod';

const createInstituteCommandSchema = z.object({
  instituteCode: z.string().trim().min(2).max(50),
  instituteName: z.string().trim().min(2).max(255),
  registrationNumber: z.string().trim().nullable().optional(),
  taxNumber: z.string().trim().nullable().optional(),
});

const updateInstituteCommandSchema = createInstituteCommandSchema
  .omit({ instituteCode: true })
  .partial();

console.log('empty:', updateInstituteCommandSchema.parse({ taxNumber: "" }));
console.log('val:', updateInstituteCommandSchema.parse({ taxNumber: "123" }));
console.log('null:', updateInstituteCommandSchema.parse({ taxNumber: null }));
console.log('undefined:', updateInstituteCommandSchema.parse({ taxNumber: undefined }));

