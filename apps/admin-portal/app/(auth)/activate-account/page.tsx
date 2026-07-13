import type { Metadata } from 'next';

import { ActivateAccountForm } from './ActivateAccountForm';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export const metadata: Metadata = {
  title: 'Activate Account',
  description:
    'Activate an Al-Saud Training Institute IMS portal account using a secure email token.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/activate-account',
  },
};

export default async function ActivateAccountPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolved = await searchParams;
  const token = typeof resolved.token === 'string' ? resolved.token : '';
  return <ActivateAccountForm token={token} />;
}
