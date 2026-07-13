import { CourseDetailPage } from '../_components/public-site';
import { buildPublicMetadata } from '../_components/public-metadata';

export const metadata = buildPublicMetadata({
  title: 'Other Courses Available',
  description:
    'Explore specialized crane, health and safety, and custom training options tailored to organizational needs.',
  path: '/other-courses-available',
});

export default function OtherCoursesAvailablePage() {
  return <CourseDetailPage slug="other-courses-available" />;
}
