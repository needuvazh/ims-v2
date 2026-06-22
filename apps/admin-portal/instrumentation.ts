import type { Instrumentation } from 'next';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') {
    return;
  }

  const { registerObservability } = await import('./app/lib/observability');
  await registerObservability();
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { reportRequestError } = await import('./app/lib/observability');
  await reportRequestError(error as Error, request, context);
};
