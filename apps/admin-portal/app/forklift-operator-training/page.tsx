import { CourseDetailPage } from '../_components/public-site';
import { buildPublicMetadata } from '../_components/public-metadata';

export const metadata = buildPublicMetadata({
  title: 'Forklift Operator Training',
  description:
    'Learn forklift operation, safety checks, loading, unloading, and practical handling at Al-Saud Training Institute.',
  path: '/forklift-operator-training',
});

export default function ForkliftOperatorTrainingPage() {
  return <CourseDetailPage slug="forklift-operator-training" />;
}
