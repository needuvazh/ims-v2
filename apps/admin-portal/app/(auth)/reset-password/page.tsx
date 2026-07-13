import type { Metadata } from 'next';

import ResetPasswordForm from './ResetPasswordForm';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export const metadata: Metadata = {
  title: 'Reset Password',
  description:
    'Set a new password for an Al-Saud Training Institute IMS portal account.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/reset-password',
  },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const token =
    typeof resolvedSearchParams.token === 'string'
      ? resolvedSearchParams.token
      : '';

  return <ResetPasswordForm token={token} />;
}
