import Link from 'next/link';
import { Alert } from '@ims/shared-ui';
import ResetPasswordForm from '../reset-password/ResetPasswordForm';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export const metadata = { title: 'Mandatory Password Change | IMS Admin' };

export default async function MandatoryPasswordChangePage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const token = typeof resolved.token === 'string' ? resolved.token : '';

  return (
    <div className="w-full max-w-3xl space-y-6 px-4 py-8">
      <Alert
        variant="warning"
        title="Password change required"
        description="Your password has expired. Complete the change using the secure link from your email, then sign in again."
      />
      <ResetPasswordForm token={token} />
      <div className="text-center text-sm text-slate-500">
        Need a fresh link? <Link href="/forgot-password" className="font-semibold text-accent-700 hover:underline">Request a password reset</Link>
      </div>
    </div>
  );
}
