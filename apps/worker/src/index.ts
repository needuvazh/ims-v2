import { prisma } from '@ims/database';
import { createStructuredLogger } from '@ims/observability';

const logger = createStructuredLogger({});
const POLL_INTERVAL_MS = parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '5000', 10);
const BATCH_SIZE = parseInt(process.env.OUTBOX_BATCH_SIZE || '50', 10);
const MAX_ATTEMPTS = 5;

let isShuttingDown = false;

async function processOutboxEvents() {
  if (isShuttingDown) return;

  try {
    const events = await prisma.outboxEvent.findMany({
      where: {
        status: 'Pending',
        availableAt: { lte: new Date() },
        attempts: { lt: MAX_ATTEMPTS },
      },
      orderBy: { availableAt: 'asc' },
      take: BATCH_SIZE,
    });

    if (events.length === 0) {
      return;
    }

    logger.debug(`Found ${events.length} outbox events to process.`);

    for (const event of events) {
      if (isShuttingDown) break;

      try {
        logger.info('Processing outbox event', { entityId: event.id, entityType: event.eventType });
        
        // TODO: In Phase 2, route event.payload to the actual domain handlers.
        // For Phase 1, we just simulate processing to ensure the loop works.
        await new Promise((resolve) => setTimeout(resolve, 50)); 
        
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'Processed',
            processedAt: new Date(),
            attempts: { increment: 1 },
          },
        });
        
        logger.info('Successfully processed outbox event', { entityId: event.id });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error('Failed to process outbox event', { entityId: event.id, error: err as Error });
        
        const newAttempts = event.attempts + 1;
        const newStatus = newAttempts >= MAX_ATTEMPTS ? 'Failed' : 'Pending';
        // Exponential backoff could be added here by updating availableAt
        
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: newStatus,
            attempts: newAttempts,
            lastError: errorMsg,
          },
        });
      }
    }
  } catch (err) {
    logger.error('Error polling outbox events', { error: err as Error });
  }
}

async function startWorker() {
  logger.info('Starting Outbox Worker', { count: BATCH_SIZE });
  
  while (!isShuttingDown) {
    await processOutboxEvents();
    // Wait for the next poll interval, or break early if shutting down
    for (let i = 0; i < POLL_INTERVAL_MS; i += 100) {
      if (isShuttingDown) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  logger.info('Outbox Worker stopped.');
  await prisma.$disconnect();
}

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  isShuttingDown = true;
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  isShuttingDown = true;
});

startWorker().catch((err) => {
  logger.error('Worker crashed', { error: err });
  process.exit(1);
});
