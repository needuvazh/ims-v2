import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Certificate Verification',
  description:
    'Verify Al-Saud Training Institute certificates using the public certificate verification tool.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/verify',
  },
};

export default function VerifyLayout({ children }: { children: ReactNode }) {
  return children;
}
