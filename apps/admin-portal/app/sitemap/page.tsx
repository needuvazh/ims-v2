import Link from 'next/link';

import { LegalPageShell } from '../_components/public-site';
import { courseCatalog, mainNavigation } from '../_components/public-site-data';

export default function SitemapPage() {
  return (
    <LegalPageShell title="Sitemap" description="A simple navigation inventory for the public site.">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3>Pages</h3>
          <ul>
            {mainNavigation.map((item) => (
              <li key={item.href}><Link href={item.href}>{item.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Courses</h3>
          <ul>
            {courseCatalog.map((course) => (
              <li key={course.slug}><Link href={`/${course.slug}`}>{course.title}</Link></li>
            ))}
          </ul>
        </div>
      </div>
    </LegalPageShell>
  );
}
