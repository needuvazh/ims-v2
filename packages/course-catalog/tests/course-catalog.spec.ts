import { expect, test, vi } from 'vitest';
import { CourseService } from '../src/application/course-service';
import { CategoryService } from '../src/application/category-service';

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
const mockPrisma = {
  department: { findUnique: vi.fn() },
  courseCategory: { findFirst: vi.fn(), findUnique: vi.fn() },
  coursePricing: { findFirst: vi.fn() },
  courseCompletionRule: { findFirst: vi.fn() },
  auditLog: { create: vi.fn() },
  outboxEvent: { create: vi.fn() },
  $transaction: vi.fn((cb) => cb(mockPrisma)),
} as any;

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
  } catch (error: any) {
    expect(error.code).toBe('ERR_CRS_DUPLICATE_CODE');
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
  } catch (error: any) {
    expect(error.code).toBe('ERR_CRS_INVALID_CODE_FORMAT');
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
  } catch (error: any) {
    expect(error.message).toBe('ERR_CRS_INVALID_ARABIC_SCRIPT');
  }
});

test('CourseService.createCourse should throw duplicate name error if name already exists in department', async () => {
  mockCourseRepository.findByCode.mockResolvedValueOnce(null);
  mockPrisma.department.findUnique.mockResolvedValueOnce({ id: 'dept-id' });
  mockCourseRepository.findByNameInDepartment.mockResolvedValueOnce({ id: 'dup-id' });

  const input = {
    courseCode: 'CS-FSWD',
    nameEnglish: 'Full Stack',
    nameArabic: 'تطوير كامل',
    departmentId: 'dept-id',
  };

  try {
    await courseService.createCourse(input, 'actor-1');
    expect.fail('Should have thrown an error');
  } catch (error: any) {
    expect(error.code).toBe('ERR_CRS_DUPLICATE_NAME');
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
  } catch (error: any) {
    expect(error.code).toBe('ERR_CRS_INVALID_DATE_RANGE');
  }
});

test('CategoryService.updateCategory should prevent cyclic parent category mappings', async () => {
  mockCategoryRepository.findById.mockResolvedValueOnce({ id: 'cat-a', parentCategoryId: null });
  mockPrisma.courseCategory.findUnique.mockResolvedValueOnce({ parentCategoryId: 'cat-a' });

  const input = {
    parentCategoryId: 'cat-b', // cat-a updated to point to cat-b
  };

  try {
    await categoryService.updateCategory('cat-a', input, 1, 'actor-1');
    expect.fail('Should have thrown an error');
  } catch (error: any) {
    expect(error.code).toBe('ERR_CRS_CYCLIC_CATEGORY');
  }
});

test('CourseService.transitionCourseStatus to Published should fail if pricing or completion rules are missing', async () => {
  mockCourseRepository.findById.mockResolvedValueOnce({ id: 'course-1', status: 'Draft', version: 1 });
  mockPrisma.coursePricing.findFirst.mockResolvedValueOnce(null); // missing pricing rule
  mockPrisma.courseCompletionRule.findFirst.mockResolvedValueOnce({ id: 'rule-1' });

  try {
    await courseService.transitionCourseStatus('course-1', 'Published', 1, 'actor-1');
    expect.fail('Should have thrown an error');
  } catch (error: any) {
    expect(error.code).toBe('ERR_CRS_MISSING_PRICING_OR_RULES');
  }
});

test('CourseService.transitionCourseStatus to Archived should fail if active batches exist', async () => {
  mockCourseRepository.findById.mockResolvedValueOnce({ id: 'course-1', status: 'Published', version: 1 });
  mockCourseRepository.hasActiveBatches.mockResolvedValueOnce(true); // active batches exist

  try {
    await courseService.transitionCourseStatus('course-1', 'Archived', 1, 'actor-1');
    expect.fail('Should have thrown an error');
  } catch (error: any) {
    expect(error.code).toBe('ERR_CRS_ACTIVE_BATCHES_EXIST');
  }
});
