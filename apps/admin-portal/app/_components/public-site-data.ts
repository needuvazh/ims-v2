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

export const contactInfo = {
  phone: '+968 9658 9150',
  phoneHref: 'tel:+96896589150',
  email: 'contactus@alsaud-intl.com',
  emailHref: 'mailto:contactus@alsaud-intl.com',
  address: 'MUSCAT, AZAIBA NORTH, AL ANWAR STREET, BUILDING NO. 648.',
  tagline:
    'Empowering future operators with hands-on training in heavy machinery and crane operation',
};

export const mainNavigation: SiteLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Courses', href: '/courses' },
  { label: 'Training Facilities', href: '/training-facilities' },
  { label: 'Upcoming Events', href: '/events' },
  { label: 'Contact', href: '/contact-us' },
];

export const quickLinks: SiteLink[] = [
  { label: 'About Al-Saud Training Institute', href: '/about' },
  { label: 'Training Courses', href: '/courses' },
  { label: 'Training Facilities', href: '/training-facilities' },
  { label: 'Contact Us', href: '/contact-us' },
  { label: 'IMS Login', href: '/login' },
];

export const eventCards = [
  {
    title: 'Open Training Intake',
    detail: 'Monthly onboarding for new operators and upskilling candidates.',
    meta: 'Rolling admissions',
  },
  {
    title: 'Corporate Team Briefing',
    detail: 'Custom training planning for companies and workforce groups.',
    meta: 'By appointment',
  },
  {
    title: 'Certification Clinic',
    detail: 'Focused sessions for assessment support and renewal guidance.',
    meta: 'Scheduled sessions',
  },
];

export const brochureCards = [
  {
    title: 'Institute Profile',
    description:
      'A concise overview of the institute, capabilities, and training philosophy.',
    action: 'Request copy',
  },
  {
    title: 'Course Catalogue',
    description:
      'Course summaries for forklift, crane, and elevated work platform training.',
    action: 'View courses',
  },
  {
    title: 'Corporate Training Note',
    description:
      'A briefing for organizations seeking group delivery or custom pathways.',
    action: 'Contact team',
  },
];

export const careerCards = [
  {
    title: 'Training Coordinator',
    description:
      'Coordinate schedules, learner communication, and training logistics.',
  },
  {
    title: 'Safety Assessor',
    description: 'Support practical assessments and ensure operator readiness.',
  },
  {
    title: 'Client Relations Executive',
    description: 'Handle enquiries, corporate accounts, and course guidance.',
  },
];

export const courseCatalog: CourseCard[] = [
  {
    slug: 'forklift-operator-training',
    title: 'Forklift Operator Training',
    summary:
      'Learn to operate forklifts safely, efficiently, and in line with workplace expectations.',
    image: '/alsaud/courses/forklift-operator.jpg',
    imageAlt: 'Forklift operator training',
    duration: 'Course Details + Practical Testing',
    price: 'Please enquire',
    points: [
      'Covering driver theory and safety rules',
      'Pre-vehicle checks, stacking, and de-stacking',
      'Loading, unloading, parking, and storage',
    ],
  },
  {
    slug: 'forklift-operator-training-course',
    title: 'Forklift Endorsement Course',
    summary:
      'Gain the legal and practical knowledge needed for safe forklift operation on a road.',
    image: '/alsaud/courses/forklift-endorsement.jpg',
    imageAlt: 'Forklift endorsement training',
    duration: 'Course Details + Practical Testing',
    price: 'Please enquire',
    points: [
      'Driving procedures and general considerations',
      'Environmental factors and legal requirements',
      'Safe parking, storage, and operating checks',
    ],
  },
  {
    slug: 'truck-mounted-crane',
    title: 'Truck Mounted Crane',
    summary:
      'Training for safe truck loader crane operation, load handling, and transport preparation.',
    image: '/alsaud/courses/truck-mounted-crane.jpg',
    imageAlt: 'Truck mounted crane training',
    duration: 'Course Details + Practical Testing',
    price: 'Please enquire',
    points: [
      'Sling, lift, move, and place regular loads',
      'Lift planning and hazard control',
      'Daily and weekly operator maintenance',
    ],
  },
  {
    slug: 'overhead-gantry-crane-operation',
    title: 'Overhead Gantry Crane Operation',
    summary:
      'Practical and theory-based instruction for radio remote or pendant-controlled cranes.',
    image: '/alsaud/courses/overhead-gantry.jpg',
    imageAlt: 'Overhead gantry crane training',
    duration: 'Course Details + Practical Testing',
    price: 'Please enquire',
    points: [
      'Components, equipment, and attachments',
      'Travel, unload, and place loads safely',
      'Observed lifts and operator maintenance',
    ],
  },
  {
    slug: 'elevated-work-platforms-2',
    title: 'Elevated Work Platforms',
    summary:
      'Training for scissor lifts, boom lifts, and safe elevated work platform practice.',
    image: '/alsaud/courses/elevated-work-platforms.jpg',
    imageAlt: 'Elevated work platform training',
    duration: 'Course Details + Practical Testing',
    price: 'Please enquire',
    points: [
      'Access worksite and prepare the equipment',
      'Use scissor, truck-mounted, self-propelled, and trailer-mounted lifts',
      'Practical assessment on the day',
    ],
  },
  {
    slug: 'other-courses-available',
    title: 'Other Courses Available',
    summary:
      'Specialised crane, health and safety, and custom courses tailored to organizational needs.',
    image: '/alsaud/courses/other-courses.jpg',
    imageAlt: 'Additional professional courses',
    duration: 'Custom delivery',
    price: 'Please enquire',
    points: [
      'Mini crawler crane and cab-controlled crane training',
      'Health and safety unit standards',
      'Customized course delivery on request',
    ],
  },
];
