export type SiteLink = {
  label: string;
  href: string;
};

export type CourseCard = {
  slug: string;
  title: string;
  summary: string;
  image: string;
  imageAlt: string;
  duration: string;
  price: string;
  points: string[];
};

export const mainNavigation: SiteLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Courses', href: '/courses' },
  { label: 'Training Facilities', href: '/training-facilities' },
  { label: 'Upcoming Events', href: '/events' },
  { label: 'Brochures', href: '/brochures' },
  { label: 'Careers', href: '/careers' },
  { label: 'Contact', href: '/contact-us' },
  { label: 'IELTS Booking', href: '/ielts/register' },
];

export const courseCatalog: CourseCard[] = [];
