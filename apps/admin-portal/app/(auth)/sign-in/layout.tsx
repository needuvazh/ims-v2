import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Secure IMS portal sign in for Al-Saud Training Institute staff.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/sign-in',
  },
};

export default function SignInLayout({ children }: { children: ReactNode }) {
  return children;
}
