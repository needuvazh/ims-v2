import { expect, test, vi } from 'vitest';
import { CourseService } from '../src/application/course-service';
import { CategoryService } from '../src/application/category-service';
import { PublicCourseQueryService } from '../src/application/public-course-query-service';
import type { PrismaClient } from '@prisma/client';

// Mock course repository
const mockCourseRepository = {
  create: vi.fn(),
  update: vi.fn(),
  findById: vi.fn(),
  findByCode: vi.fn(),
  findByNameInDepartment: vi.fn(),
  findAll: vi.fn(),
  delete: vi.fn(),
  hasActiveBatches: vi.fn(),
};

// Mock category repository
const mockCategoryRepository = {
  create: vi.fn(),
  update: vi.fn(),
  findById: vi.fn(),
  findByCode: vi.fn(),
  findAll: vi.fn(),
};

// Mock prisma client
const mockCourseQueries = {
  findMany: vi.fn(),
  count: vi.fn(),
  findFirst: vi.fn(),
  groupBy: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

const mockPrisma = {
  department: { findUnique: vi.fn() },
  courseCategory: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  coursePricing: { findFirst: vi.fn() },
  courseCompletionRule: { findFirst: vi.fn() },
  auditLog: { create: vi.fn() },
  outboxEvent: { create: vi.fn() },
  course: mockCourseQueries,
  $transaction: vi.fn((cb) => cb(mockPrisma)),
} as unknown as PrismaClient;

const courseService = new CourseService(mockPrisma, mockCourseRepository);
const categoryService = new CategoryService(mockPrisma, mockCategoryRepository);

test('CourseService.createCourse should throw duplicate code error if code exists', async () => {
  mockCourseRepository.findByCode.mockResolvedValueOnce({ id: 'existing-id' });

  const input = {
    courseCode: 'CS-FSWD',
    nameEnglish: 'Full Stack',
    nameArabic: 'تطوير كامل',
    departmentId: 'dept-id',
  };

  try {
    await courseService.createCourse(input, 'actor-1');
    expect.fail('Should have thrown an error');
  } catch (error: unknown) {
    expect((error as { code?: string }).code).toBe('ERR_CRS_DUPLICATE_CODE');
  }
});

test('CourseService.createCourse should throw invalid code format error if format is invalid', async () => {
  const input = {
    courseCode: 'cs fswd', // invalid format (lowercase and spaces)
    nameEnglish: 'Full Stack',
    nameArabic: 'تطوير كامل',
    departmentId: 'dept-id',
  };

  try {
    await courseService.createCourse(input, 'actor-1');
    expect.fail('Should have thrown an error');
  } catch (error: unknown) {
    expect((error as { code?: string }).code).toBe(
      'ERR_CRS_INVALID_CODE_FORMAT',
    );
  }
});

test('CourseService.createCourse should throw invalid Arabic script error if nameArabic is not in Arabic script', async () => {
  mockCourseRepository.findByCode.mockResolvedValueOnce(null);

  const input = {
    courseCode: 'CS-FSWD',
    nameEnglish: 'Full Stack',
    nameArabic: 'Not Arabic', // invalid script
    departmentId: 'dept-id',
  };

  try {
    await courseService.createCourse(input, 'actor-1');
    expect.fail('Should have thrown an error');
  } catch (error: unknown) {
    expect((error as { message?: string }).message).toBe(
      'ERR_CRS_INVALID_ARABIC_SCRIPT',
    );
  }
});

test('CourseService.createCourse should throw duplicate name error if name already exists in department', async () => {
  mockCourseRepository.findByCode.mockResolvedValueOnce(null);
  mockPrisma.department.findUnique.mockResolvedValueOnce({ id: 'dept-id' });
  mockCourseRepository.findByNameInDepartment.mockResolvedValueOnce({
    id: 'dup-id',
  });

  const input = {
    courseCode: 'CS-FSWD',
    nameEnglish: 'Full Stack',
    nameArabic: 'تطوير كامل',
    departmentId: 'dept-id',
  };

  try {
    await courseService.createCourse(input, 'actor-1');
    expect.fail('Should have thrown an error');
  } catch (error: unknown) {
    expect((error as { code?: string }).code).toBe('ERR_CRS_DUPLICATE_NAME');
  }
});

test('CourseService.createCourse should throw invalid date range error if end date is on or before start date', async () => {
  mockCourseRepository.findByCode.mockResolvedValueOnce(null);
  mockPrisma.department.findUnique.mockResolvedValueOnce({ id: 'dept-id' });
  mockCourseRepository.findByNameInDepartment.mockResolvedValueOnce(null);

  const input = {
    courseCode: 'CS-FSWD',
    nameEnglish: 'Full Stack',
    nameArabic: 'تطوير كامل',
    departmentId: 'dept-id',
    effectiveStartDate: new Date('2026-07-02'),
    effectiveEndDate: new Date('2026-07-01'), // invalid
  };

  try {
    await courseService.createCourse(input, 'actor-1');
    expect.fail('Should have thrown an error');
  } catch (error: unknown) {
    expect((error as { code?: string }).code).toBe(
      'ERR_CRS_INVALID_DATE_RANGE',
    );
  }
});

test('CategoryService.updateCategory should prevent cyclic parent category mappings', async () => {
  mockCategoryRepository.findById.mockResolvedValueOnce({
    id: 'cat-a',
    parentCategoryId: null,
  });
  mockPrisma.courseCategory.findUnique.mockResolvedValueOnce({
    parentCategoryId: 'cat-a',
  });

  const input = {
    parentCategoryId: 'cat-b', // cat-a updated to point to cat-b
  };

  try {
    await categoryService.updateCategory('cat-a', input, 1, 'actor-1');
    expect.fail('Should have thrown an error');
  } catch (error: unknown) {
    expect((error as { code?: string }).code).toBe('ERR_CRS_CYCLIC_CATEGORY');
  }
});

test('CourseService.transitionCourseStatus to Published should fail if pricing or completion rules are missing', async () => {
  mockCourseRepository.findById.mockResolvedValueOnce({
    id: 'course-1',
    status: 'Draft',
    version: 1,
  });
  mockPrisma.coursePricing.findFirst.mockResolvedValueOnce(null); // missing pricing rule
  mockPrisma.courseCompletionRule.findFirst.mockResolvedValueOnce({
    id: 'rule-1',
  });

  try {
    await courseService.transitionCourseStatus(
      'course-1',
      'Published',
      1,
      'actor-1',
    );
    expect.fail('Should have thrown an error');
  } catch (error: unknown) {
    expect((error as { code?: string }).code).toBe(
      'ERR_CRS_MISSING_PRICING_OR_RULES',
    );
  }
});

test('CourseService.transitionCourseStatus to Archived should fail if active batches exist', async () => {
  mockCourseRepository.findById.mockResolvedValueOnce({
    id: 'course-1',
    status: 'Published',
    version: 1,
  });
  mockCourseRepository.hasActiveBatches.mockResolvedValueOnce(true); // active batches exist

  try {
    await courseService.transitionCourseStatus(
      'course-1',
      'Archived',
      1,
      'actor-1',
    );
    expect.fail('Should have thrown an error');
  } catch (error: unknown) {
    expect((error as { code?: string }).code).toBe(
      'ERR_CRS_ACTIVE_BATCHES_EXIST',
    );
  }
});

const publicQueryService = new PublicCourseQueryService(mockPrisma);

test('PublicCourseQueryService.getPublishedCourses filters by isPubliclyExposed: true and respects showPricingPublicly', async () => {
  mockCourseQueries.findMany.mockResolvedValueOnce([
    {
      id: 'course-1',
      courseCode: 'CS-101',
      nameEnglish: 'Intro to CS',
      nameArabic: 'مقدمة في علوم الحاسب',
      descriptionEnglish: 'Intro course',
      durationType: 'Weeks',
      durationValue: 12,
      isPubliclyExposed: true,
      bannerImage: 'http://example.com/banner.jpg',
      showPricingPublicly: false, // pricing hidden!
      hasPracticalInstruction: true,
      practicalTestingDescription: 'Hands-on project',
      category: { code: 'CAT-1', nameEnglish: 'CS' },
      pricings: [{ basePrice: 100, currency: 'USD' }],
      batches: [],
    },
  ]);
  mockCourseQueries.count.mockResolvedValueOnce(1);

  const result = await publicQueryService.getPublishedCourses({});
  expect(result.items).toHaveLength(1);
  expect(result.items[0].imageUrl).toBe('http://example.com/banner.jpg');
  expect(result.items[0].basePrice).toBeNull(); // basePrice is null because showPricingPublicly is false
  expect(result.items[0].currency).toBeNull();
  expect(result.items[0].showPricingPublicly).toBe(false);
  expect(result.items[0].hasPracticalInstruction).toBe(true);
  expect(result.items[0].practicalTestingDescription).toBe('Hands-on project');
});

test('PublicCourseQueryService.getCourseDetail returns dynamic category hierarchy', async () => {
  mockCourseQueries.findFirst.mockResolvedValueOnce({
    id: 'course-1',
    courseCode: 'CS-101',
    nameEnglish: 'Intro to CS',
    nameArabic: 'مقدمة في علوم الحاسب',
    descriptionEnglish: 'Intro course',
    descriptionArabic: 'مقدمة',
    categoryId: 'cat-2',
    durationType: 'Weeks',
    durationValue: 12,
    isPubliclyExposed: true,
    bannerImage: 'http://example.com/banner.jpg',
    showPricingPublicly: true,
    hasPracticalInstruction: false,
    practicalTestingDescription: null,
    metaTitle: 'SEO Title',
    metaDescription: 'SEO Desc',
    metaKeywords: 'SEO Keywords',
    syllabusOutline: 'Outline content',
    category: { code: 'CAT-2', nameEnglish: 'Advanced CS' },
    pricings: [{ basePrice: 200, taxPercentage: 5, currency: 'USD' }],
    batches: [],
  });

  // Mock hierarchy traversal: cat-2 parent is cat-1, cat-1 parent is null
  mockPrisma.courseCategory.findUnique
    .mockResolvedValueOnce({
      id: 'cat-2',
      code: 'CAT-2',
      nameEnglish: 'Advanced CS',
      nameArabic: 'علوم حاسب متقدمة',
      parentCategoryId: 'cat-1',
    })
    .mockResolvedValueOnce({
      id: 'cat-1',
      code: 'CAT-1',
      nameEnglish: 'Introductory CS',
      nameArabic: 'علوم حاسب تمهيدية',
      parentCategoryId: null,
    });

  const detail = await publicQueryService.getCourseDetail('course-1');
  expect(detail).not.toBeNull();
  expect(detail!.imageUrl).toBe('http://example.com/banner.jpg');
  expect(detail!.basePrice).toBe('200');
  expect(detail!.categoryHierarchy).toHaveLength(2);
  expect(detail!.categoryHierarchy[0].id).toBe('cat-1');
  expect(detail!.categoryHierarchy[1].id).toBe('cat-2');
  expect(detail!.metaTitle).toBe('SEO Title');
  expect(detail!.syllabusOutline).toBe('Outline content');
});
