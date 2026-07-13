import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Forgot Password',
  description:
    'Request a secure password reset link for the Al-Saud Training Institute IMS portal.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/forgot-password',
  },
};

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
