import { CourseDetailPage } from '../_components/public-site';
import { buildPublicMetadata } from '../_components/public-metadata';

export const metadata = buildPublicMetadata({
  title: 'Overhead Gantry Crane Operation',
  description:
    'Build confidence with radio remote and pendant-controlled overhead gantry crane training at ASTI.',
  path: '/overhead-gantry-crane-operation',
});

export default function OverheadGantryCranePage() {
  return <CourseDetailPage slug="overhead-gantry-crane-operation" />;
}
