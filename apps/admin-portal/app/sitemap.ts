import type { MetadataRoute } from 'next';

import { courseCatalog, mainNavigation } from './_components/public-site-data';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ims-asti-uat.vercel.app';

const staticPaths = [
  '/',
  '/about',
  '/courses',
  '/training-facilities',
  '/events',
  '/contact-us',
  '/privacy',
  '/terms',
];

const staticPathSet = new Set(staticPaths);

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries = staticPaths.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '/' ? 1 : 0.8,
  }));

  const navigationEntries = mainNavigation
    .filter((item) => !staticPathSet.has(item.href) && !['/login', '/verify'].includes(item.href))
    .map((item) => ({
      url: `${siteUrl}${item.href}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

  const courseEntries = courseCatalog.map((course) => ({
    url: `${siteUrl}/${course.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }));

  return [...staticEntries, ...navigationEntries, ...courseEntries];
}
