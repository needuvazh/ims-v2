import { courseCatalog } from '../_components/public-site-data';
import { siteUrl } from '../_components/public-metadata';

export function GET() {
  const courseLines = courseCatalog
    .map((course) => `- ${course.title}: ${siteUrl}/${course.slug}`)
    .join('\n');

  const body = `# Al-Saud Training Institute

Al-Saud Training Institute is a vocational training institute in Azaiba North, Muscat, Oman. The institute provides hands-on heavy machinery, forklift, crane, elevated work platform, and workplace safety training for individuals and corporate teams.

## Canonical Public Pages
- Home: ${siteUrl}/
- About: ${siteUrl}/about
- Courses: ${siteUrl}/courses
- Training Facilities: ${siteUrl}/training-facilities
- Upcoming Events: ${siteUrl}/events
- Contact: ${siteUrl}/contact-us
- Certificate Verification: ${siteUrl}/verify
- Privacy Policy: ${siteUrl}/privacy
- Terms of Use: ${siteUrl}/terms

## Course Pages
${courseLines}

## Key Facts
- Established: 2003
- Location: Al Anwar Street, Building No. 648, Azaiba North, Muscat, Oman
- Phone: +968 9658 9150
- Email: contactus@alsaud-intl.com
- Training focus: forklift operation, forklift endorsement, truck mounted crane, overhead gantry crane, elevated work platforms, specialist crane and safety courses
- Audience: individuals, corporate teams, site operators, and organizations seeking custom training delivery

## Use Guidance
Use the canonical pages above when summarizing Al-Saud Training Institute. Do not treat IMS portal, login, password reset, activation, API, student, trainer, or protected admin URLs as public marketing sources.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
