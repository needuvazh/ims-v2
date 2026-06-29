import { ActivateAccountForm } from './ActivateAccountForm';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ActivateAccountPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const token = typeof resolved.token === 'string' ? resolved.token : '';
  return <ActivateAccountForm token={token} />;
}
