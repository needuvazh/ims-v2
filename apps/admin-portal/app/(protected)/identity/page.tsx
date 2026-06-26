import { redirect } from 'next/navigation';

export const metadata = { title: 'Identity & Access | IMS Admin' };

export default function IdentityIndexPage() {
  redirect('/identity/users');
}
