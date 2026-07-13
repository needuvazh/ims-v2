import type { MetadataRoute } from 'next';

const siteUrl = 'https://ims-asti-uat.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/login',
          '/sign-in',
          '/forgot-password',
          '/reset-password',
          '/activate-account',
          '/mandatory-password-change',
          '/student',
          '/trainer',
          '/api',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
