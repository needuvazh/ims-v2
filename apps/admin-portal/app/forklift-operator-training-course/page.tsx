import { CourseDetailPage } from '../_components/public-site';
import { buildPublicMetadata } from '../_components/public-metadata';

export const metadata = buildPublicMetadata({
  title: 'Forklift Endorsement Course',
  description:
    'Gain the legal and practical knowledge needed for safe forklift endorsement training in Muscat.',
  path: '/forklift-operator-training-course',
});

export default function ForkliftEndorsementPage() {
  return <CourseDetailPage slug="forklift-operator-training-course" />;
}
