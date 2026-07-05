import { redirect } from 'next/navigation';

export const metadata = { title: 'Faculty | IMS Admin' };

export default function FacultyRootPage() {
  redirect('/faculty/dashboard');
}
