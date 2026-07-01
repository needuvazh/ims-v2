'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertPermission, getSession } from '../../lib/auth-guard';
import { CreateCourseSchema, UpdateCourseSchema, CreateCategorySchema } from '@ims/course-catalog';
import { prisma } from '@ims/database';

export async function createCourseAction(data: any) {
  try {
    await assertPermission('course.catalog.create');
    const session = await getSession();

    const parsed = CreateCourseSchema.parse(data);

    const { courseService } = await import('../../lib/runtime');
    const result = await courseService.createCourse(parsed, session.userId);

    revalidatePath('/courses-catalog');
    return { success: true as const, data: result };
  } catch (error: any) {
    return buildCourseActionFailure(error);
  }
}

export async function updateCourseAction(id: string, version: number, data: any) {
  try {
    await assertPermission('course.catalog.update');
    const session = await getSession();

    const parsed = UpdateCourseSchema.parse(data);

    const { courseService } = await import('../../lib/runtime');
    const result = await courseService.updateCourse(id, parsed, version, session.userId);

    revalidatePath('/courses-catalog');
    revalidatePath(`/courses-catalog/${id}`);
    return { success: true as const, data: result };
  } catch (error: any) {
    return buildCourseActionFailure(error);
  }
}

export async function transitionCourseStatusAction(id: string, targetStatus: string, version: number) {
  try {
    const requiredPermission = targetStatus === 'Archived' ? 'course.catalog.archive' : 'course.catalog.publish';
    await assertPermission(requiredPermission);
    const session = await getSession();

    const { courseService } = await import('../../lib/runtime');
    const result = await courseService.transitionCourseStatus(id, targetStatus, version, session.userId);

    revalidatePath('/courses-catalog');
    revalidatePath(`/courses-catalog/${id}`);
    return { success: true as const, data: result };
  } catch (error: any) {
    return buildCourseActionFailure(error);
  }
}

export async function createCategoryAction(data: any) {
  try {
    await assertPermission('course.catalog.create');
    const session = await getSession();

    const parsed = CreateCategorySchema.parse(data);

    const { categoryService } = await import('../../lib/runtime');
    const result = await categoryService.createCategory(parsed, session.userId);

    revalidatePath('/courses-catalog');
    return { success: true as const, data: result };
  } catch (error: any) {
    return buildCourseActionFailure(error);
  }
}

function buildCourseActionFailure(error: any) {
  if (error instanceof z.ZodError) {
    return {
      success: false as const,
      status: 'VALIDATION_ERROR',
      fieldErrors: error.flatten().fieldErrors,
      error: 'Please fix the errors in the form.',
    };
  }

  const message = error?.message || 'An unknown error occurred';

  if (message.includes('ERR_CRS_DUPLICATE_CODE')) {
    return { success: false as const, error: 'A course with this code already exists.' };
  }
  if (message.includes('ERR_CRS_DUPLICATE_NAME')) {
    return { success: false as const, error: 'A course with this name already exists in this department.' };
  }
  if (message.includes('ERR_CRS_INVALID_CODE_FORMAT')) {
    return { success: false as const, error: 'Course code must be uppercase alphanumeric and between 3 to 20 characters.' };
  }
  if (message.includes('ERR_CRS_INVALID_DATE_RANGE')) {
    return { success: false as const, error: 'Effective end date must be after effective start date.' };
  }
  if (message.includes('ERR_CRS_CYCLIC_CATEGORY')) {
    return { success: false as const, error: 'Cyclic parent-child hierarchy detected in categories.' };
  }
  if (message.includes('ERR_CRS_ACTIVE_COURSE_LOCKED')) {
    return { success: false as const, error: 'Classification or duration cannot be changed on a published course with active batches.' };
  }
  if (message.includes('ERR_CRS_MISSING_PRICING_OR_RULES')) {
    return { success: false as const, error: 'A course must have at least one active pricing rule and one active completion rule configured to be published.' };
  }
  if (message.includes('ERR_CRS_ACTIVE_BATCHES_EXIST')) {
    return { success: false as const, error: 'Cannot archive course with active batches in OpenForEnrollment or InProgress status.' };
  }
  if (message.includes('ERR_CRS_INVALID_ARABIC_SCRIPT')) {
    return { success: false as const, error: 'Arabic name or description must contain only Arabic characters.' };
  }

  return {
    success: false as const,
    status: 'SYSTEM_ERROR',
    error: message,
  };
}
