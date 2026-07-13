import type { Metadata } from 'next';

const siteUrl = 'https://ims-asti-uat.vercel.app';

type PublicMetadataInput = {
  title: string;
  description: string;
  path: string;
};

export function buildPublicMetadata({
  title,
  description,
  path,
}: PublicMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}${path}`,
      siteName: 'Al-Saud Training Institute',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}
