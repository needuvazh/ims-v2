import { CourseDetailPage } from '../_components/public-site';
import { buildPublicMetadata } from '../_components/public-metadata';

export const metadata = buildPublicMetadata({
  title: 'Elevated Work Platforms Training',
  description:
    'Learn scissor lift, boom lift, and elevated work platform operation with hands-on practical training.',
  path: '/elevated-work-platforms-2',
});

export default function ElevatedWorkPlatformsPage() {
  return <CourseDetailPage slug="elevated-work-platforms-2" />;
}
