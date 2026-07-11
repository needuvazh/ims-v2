import { expect, test, vi, beforeEach } from 'vitest';
import { CourseExamTemplateService } from '../src/application/course-exam-template-service';
import type { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock repositories
const mockTemplateRepository = {
  create: vi.fn(),
  update: vi.fn(),
  findById: vi.fn(),
  findAll: vi.fn(),
  delete: vi.fn(),
};

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

// Mock prisma client
const mockPrisma = {
  course: {
    findFirst: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn((cb) => cb(mockPrisma)),
} as unknown as PrismaClient;

const service = new CourseExamTemplateService(
  mockPrisma,
  mockTemplateRepository as any,
  mockCourseRepository as any,
);

beforeEach(() => {
  vi.clearAllMocks();
});

test('createTemplate throws error if course does not exist', async () => {
  mockPrisma.course.findFirst = vi.fn().mockResolvedValueOnce(null);

  const input = {
    courseId: 'non-existent-course-id',
    examName: 'Midterm',
    maxMarks: 100,
    passMarks: 50,
  };

  await expect(service.createTemplate(input, 'actor-1')).rejects.toThrow('ERR_CRS_COURSE_NOT_FOUND');
});

test('createTemplate throws error if course is Published and has active batches', async () => {
  mockPrisma.course.findFirst = vi.fn().mockResolvedValueOnce({
    id: 'course-id',
    status: 'Published',
    isDeleted: false,
  });
  mockCourseRepository.hasActiveBatches.mockResolvedValueOnce(true);

  const input = {
    courseId: 'course-id',
    examName: 'Midterm',
    maxMarks: 100,
    passMarks: 50,
  };

  try {
    await service.createTemplate(input, 'actor-1');
    expect.fail('Should have thrown an error');
  } catch (error: any) {
    expect(error.code).toBe('ERR_CRS_ACTIVE_COURSE_LOCKED');
  }
});

test('createTemplate throws error if course is Archived', async () => {
  mockPrisma.course.findFirst = vi.fn().mockResolvedValueOnce({
    id: 'course-id',
    status: 'Archived',
    isDeleted: false,
  });

  const input = {
    courseId: 'course-id',
    examName: 'Midterm',
    maxMarks: 100,
    passMarks: 50,
  };

  await expect(service.createTemplate(input, 'actor-1')).rejects.toThrow('ERR_CRS_ARCHIVED_COURSE_LOCKED');
});

test('createTemplate throws error if passMarks exceed maxMarks', async () => {
  mockPrisma.course.findFirst = vi.fn().mockResolvedValueOnce({
    id: 'course-id',
    status: 'Draft',
    isDeleted: false,
  });

  const input = {
    courseId: 'course-id',
    examName: 'Midterm',
    maxMarks: 100,
    passMarks: 150, // exceeds max marks
  };

  await expect(service.createTemplate(input, 'actor-1')).rejects.toThrow('Passing marks cannot exceed maximum marks');
});

test('createTemplate creates template and writes audit log successfully', async () => {
  mockPrisma.course.findFirst = vi.fn().mockResolvedValueOnce({
    id: 'course-id',
    status: 'Draft',
    isDeleted: false,
  });

  const createdTemplate = {
    id: 'template-id',
    courseId: 'course-id',
    examName: 'Midterm',
    maxMarks: new Decimal(100),
    passMarks: new Decimal(50),
    status: 'Active',
    createdBy: 'actor-1',
  };
  mockTemplateRepository.create.mockResolvedValueOnce(createdTemplate);

  const input = {
    courseId: 'course-id',
    examName: 'Midterm',
    maxMarks: 100,
    passMarks: 50,
  };

  const result = await service.createTemplate(input, 'actor-1');

  expect(result).toEqual(createdTemplate);
  expect(mockTemplateRepository.create).toHaveBeenCalled();
  expect(mockPrisma.auditLog.create).toHaveBeenCalled();
});
