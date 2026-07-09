import { describe, it } from 'vitest';
import { prisma } from '../../../../lib/runtime';

describe('DB debug batch', () => {
  it('print batch details', async () => {
    const batch = await prisma.batch.findUnique({
      where: { id: 'bd366b4d-9f2f-4b09-85b2-11cd5f181598' },
      include: {
        course: true,
      }
    });
    console.log('Batch:', JSON.stringify(batch, null, 2));

    const allBatches = await prisma.batch.findMany({
      select: {
        id: true,
        batchCode: true,
        status: true,
        startDate: true,
        endDate: true,
        isDeleted: true
      }
    });
    console.log('All Batches:', JSON.stringify(allBatches, null, 2));
  });
});
