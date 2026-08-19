import type { Instrumentation } from 'next';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') {
    return;
  }

  const { registerObservability } = await import('./app/lib/observability');
  await registerObservability();
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const err = error as any;
  const isUnauthorized =
    err &&
    ((err.name === 'DomainError' && err.code === 'unauthorized') ||
      err.code === 'unauthorized' ||
      err.message?.includes('session has been revoked or has expired') ||
      err.message?.includes('Session has expired') ||
      err.message?.includes('Authentication required'));

  if (isUnauthorized) {
    return;
  }

  const { reportRequestError } = await import('./app/lib/observability');
  await reportRequestError(error as Error, request, context);
};
