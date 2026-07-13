import { CourseDetailPage } from '../_components/public-site';
import { buildPublicMetadata } from '../_components/public-metadata';

export const metadata = buildPublicMetadata({
  title: 'Truck Mounted Crane Training',
  description:
    'Train in safe truck mounted crane operation, load handling, lift planning, and operator maintenance.',
  path: '/truck-mounted-crane',
});

export default function TruckMountedCranePage() {
  return <CourseDetailPage slug="truck-mounted-crane" />;
}
