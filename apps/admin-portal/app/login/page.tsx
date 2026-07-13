import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'IMS Login',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/login',
  },
};

export default function LoginPage() {
  redirect('/sign-in');
}
