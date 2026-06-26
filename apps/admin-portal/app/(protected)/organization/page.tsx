import { redirect } from 'next/navigation';

export const metadata = { title: 'Organization | IMS Admin' };
export const dynamic = 'force-dynamic';

export default function OrganizationIndexPage() {
  redirect('/organization/institutes');
}

