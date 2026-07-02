import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../packages/database/src/client';
import { CourseRepository } from '../packages/course-catalog/src/infrastructure/course-repository';
import { CourseCategoryRepository } from '../packages/course-catalog/src/infrastructure/category-repository';
import { CourseService } from '../packages/course-catalog/src/application/course-service';
import { CategoryService } from '../packages/course-catalog/src/application/category-service';
import { createUuid } from '../packages/shared-kernel/src/value-objects';
import { randomUUID } from 'crypto';

describe('Course Catalog Database Integration', () => {
  let courseRepository: CourseRepository;
  let categoryRepository: CourseCategoryRepository;
  let courseService: CourseService;
  let categoryService: CategoryService;
  let departmentId: string;

  beforeAll(async () => {
    courseRepository = new CourseRepository(prisma);
    categoryRepository = new CourseCategoryRepository(prisma);
    courseService = new CourseService(prisma, courseRepository);
    categoryService = new CategoryService(prisma, categoryRepository);

    // Fetch or create a department for logical references
    let dept = await prisma.department.findFirst({
      where: { isDeleted: false },
    });
    if (!dept) {
      const branch = await prisma.branch.findFirst() || await prisma.branch.create({
        data: {
          id: createUuid(randomUUID()),
          instituteId: createUuid(randomUUID()),
          branchCode: 'TSTBR',
          branchName: 'Test Branch',
          status: 'Active',
          institute: {
            create: {
              id: createUuid(randomUUID()),
              instituteCode: 'TSTINST',
              instituteName: 'Test Inst',
            }
          }
        }
      });
      dept = await prisma.department.create({
        data: {
          id: createUuid(randomUUID()),
          branchId: branch.id,
          departmentCode: 'TSTDEPT',
          departmentName: 'Test Dept',
          status: 'Active',
        }
      });
    }
    departmentId = dept.id;
  });

  it('can create and list course categories', async () => {
    const code = `CAT-${Math.floor(1000 + Math.random() * 9000)}`;
    const category = await categoryService.createCategory({
      code,
      nameEnglish: 'Integration Test Cat',
      nameArabic: 'التكنولوجيا والهندسة',
    }, '00000000-0000-0000-0000-000000000000');

    expect(category.id).toBeDefined();
    expect(category.code).toBe(code);

    const categories = await categoryService.listCategories();
    expect(categories.some(c => c.id === category.id)).toBe(true);
  });

  it('can create course templates and transition status', async () => {
    const randDigits = Math.floor(1000 + Math.random() * 9000);
    const courseCode = `CS-TEST-${randDigits}`;
    const arabicDigits = String(randDigits).split('').map(d => String.fromCharCode(0x0660 + Number(d))).join('');
    const course = await courseService.createCourse({
      courseCode,
      nameEnglish: `Integration Course ${courseCode}`,
      nameArabic: `دورة تجريبية للتكامل ${arabicDigits}`,
      departmentId,
      courseClassification: 'Regular',
      durationType: 'Weeks',
      durationValue: 8,
      effectiveStartDate: new Date(),
    }, '00000000-0000-0000-0000-000000000000');

    expect(course.id).toBeDefined();
    expect(course.status).toBe('Draft');

    // Create stub pricing and completion rule so we can publish the course
    await prisma.coursePricing.create({
      data: {
        id: createUuid(randomUUID()),
        courseId: course.id,
        status: 'Active',
        customerType: 'Individual',
        batchType: 'Regular',
        basePrice: 100,
        effectiveStartDate: new Date(),
      }
    });

    await prisma.courseCompletionRule.create({
      data: {
        id: createUuid(randomUUID()),
        courseId: course.id,
        status: 'Active',
        minimumAttendancePercent: 80,
        effectiveStartDate: new Date(),
      }
    });

    const published = await courseService.transitionCourseStatus(
      course.id,
      'Published',
      course.version,
      '00000000-0000-0000-0000-000000000000'
    );

    expect(published.status).toBe('Published');
  });
});
