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
  { label: 'Contact', href: '/contact-us' },
];

export const courseCatalog: CourseCard[] = [];
