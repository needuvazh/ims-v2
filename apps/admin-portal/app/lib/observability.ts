import { headers as nextHeaders } from 'next/headers';
import {
  applyRequestContextHeaders,
  createCurrentRequestContext,
  createStructuredLogger,
  getCurrentRequestContext,
  getCurrentRequestLogger,
  registerObservability,
  reportRequestError,
  runWithRequestContext,
  withRequestContextFromHeaders,
  type HeaderBag,
  type RequestContext,
} from '@ims/observability/node';

export async function withServerActionObservability<T>(
  work: () => Promise<T> | T,
  overrides: Partial<RequestContext> = {},
): Promise<T> {
  const requestHeaders = await nextHeaders();
  return withRequestContextFromHeaders(requestHeaders, work, overrides);
}

export function withRouteObservability<T>(
  source: HeaderBag,
  work: () => Promise<T> | T,
  overrides: Partial<RequestContext> = {},
): T | Promise<T> {
  return withRequestContextFromHeaders(source, work, overrides);
}

export function createObservabilityResponseHeaders(
  source: HeaderBag,
  overrides: Partial<RequestContext> = {},
): { context: RequestContext; headers: Headers } {
  const context = createCurrentRequestContext(source, overrides);
  const headers = new Headers();
  applyRequestContextHeaders(headers, context);
  return { context, headers };
}

export function applyObservabilityResponseHeaders(
  target: Headers,
  source: HeaderBag,
  overrides: Partial<RequestContext> = {},
): RequestContext {
  const { context, headers } = createObservabilityResponseHeaders(source, overrides);
  headers.forEach((value, key) => target.set(key, value));
  return context;
}

export {
  createCurrentRequestContext,
  createStructuredLogger,
  getCurrentRequestContext,
  getCurrentRequestLogger,
  registerObservability,
  reportRequestError,
  runWithRequestContext,
};

export type { HeaderBag, RequestContext };
