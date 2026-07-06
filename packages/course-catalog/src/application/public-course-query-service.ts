import { PrismaClient, Prisma } from '@prisma/client';
import type {
  PublicCourseListItem,
  PublicCourseDetail,
  PublicCategory,
  PublicBatch,
} from '../domain/public-dtos';

export interface PublicCourseFilters {
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export class PublicCourseQueryService {
  constructor(private readonly prisma: PrismaClient) {}

  async getPublishedCourses(
    filters: PublicCourseFilters
  ): Promise<PaginatedResult<PublicCourseListItem>> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.CourseWhereInput = {
      status: 'Published',
      isPubliclyExposed: true,
      isDeleted: false,
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.search && {
        OR: [
          { nameEnglish: { contains: filters.search, mode: 'insensitive' } },
          { nameArabic: { contains: filters.search, mode: 'insensitive' } },
          { descriptionEnglish: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [coursesRaw, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          category: {
            select: {
              code: true,
              nameEnglish: true,
            },
          },
          pricings: {
            where: {
              status: 'Active',
              isDeleted: false,
              branchId: null,
              batchId: null,
            },
            take: 1,
            select: {
              basePrice: true,
              currency: true,
            },
          },
          batches: {
            where: {
              status: { in: ['OpenForEnrollment', 'InProgress'] },
              isDeleted: false,
              startDate: { gte: new Date() },
            },
            orderBy: [{ startDate: 'asc' }],
            take: 1,
            select: {
              startDate: true,
              capacity: true,
              currentEnrollmentCount: true,
            },
          },
        },
      }) as Promise<any[]>,
      this.prisma.course.count({ where }),
    ]);

    const items: PublicCourseListItem[] = coursesRaw.map((course: any) => {
      const nextBatch = course.batches?.[0];
      const pricing = course.pricings?.[0];
      const showPricing = !!course.showPricingPublicly;

      return {
        id: course.id,
        slug: this.generateSlug(course.courseCode, course.nameEnglish),
        nameEnglish: course.nameEnglish,
        nameArabic: course.nameArabic,
        descriptionEnglish: course.descriptionEnglish,
        categoryCode: course.category?.code ?? null,
        categoryName: course.category?.nameEnglish ?? null,
        durationType: course.durationType,
        durationValue: course.durationValue,
        basePrice: showPricing && pricing?.basePrice ? pricing.basePrice.toString() : null,
        currency: showPricing && pricing?.currency ? pricing.currency : null,
        nextBatchDate: nextBatch?.startDate?.toISOString().split('T')[0] ?? null,
        availableSeats: nextBatch ? nextBatch.capacity - nextBatch.currentEnrollmentCount : null,
        imageUrl: course.bannerImage ?? null,
        showPricingPublicly: showPricing,
        hasPracticalInstruction: !!course.hasPracticalInstruction,
        practicalTestingDescription: course.practicalTestingDescription ?? null,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getCourseDetail(idOrSlug: string): Promise<PublicCourseDetail | null> {
    const courseRaw = await this.prisma.course.findFirst({
      where: {
        status: 'Published',
        isPubliclyExposed: true,
        isDeleted: false,
        OR: [
          { id: idOrSlug },
          { courseCode: idOrSlug.toUpperCase() },
        ],
      },
      include: {
        category: {
          select: {
            code: true,
            nameEnglish: true,
          },
        },
        pricings: {
          where: {
            status: 'Active',
            isDeleted: false,
            branchId: null,
            batchId: null,
          },
          take: 1,
          select: {
            basePrice: true,
            taxPercentage: true,
            currency: true,
          },
        },
        batches: {
          where: {
            status: { in: ['OpenForEnrollment', 'InProgress'] },
            isDeleted: false,
          },
          orderBy: [{ startDate: 'asc' }],
          include: {
            trainers: {
              where: {
                status: 'Active',
                isDeleted: false,
              },
            },
          },
        },
      },
    }) as any;

    if (!courseRaw) return null;

    const pricing = courseRaw.pricings?.[0];
    const categoryHierarchy = await this.getCategoryHierarchy(courseRaw.categoryId);
    const showPricing = !!courseRaw.showPricingPublicly;

    const batches = (courseRaw.batches ?? []).map((batch: any) => {
      const primaryTrainer = batch.trainers?.find((t: any) => t.role === 'Primary') ?? batch.trainers?.[0];
      return {
        id: batch.id,
        batchCode: batch.batchCode,
        batchName: batch.batchNameEnglish,
        startDate: batch.startDate?.toISOString().split('T')[0],
        endDate: batch.endDate?.toISOString().split('T')[0],
        capacity: batch.capacity,
        currentEnrollment: batch.currentEnrollmentCount,
        availableSeats: batch.capacity - batch.currentEnrollmentCount,
        status: batch.status,
        branchName: null,
        trainerName: primaryTrainer?.trainerId ? `Trainer ${primaryTrainer.trainerId.slice(0, 8)}` : null,
      };
    });

    return {
      id: courseRaw.id,
      slug: this.generateSlug(courseRaw.courseCode, courseRaw.nameEnglish),
      nameEnglish: courseRaw.nameEnglish,
      nameArabic: courseRaw.nameArabic,
      descriptionEnglish: courseRaw.descriptionEnglish,
      descriptionArabic: courseRaw.descriptionArabic,
      courseCode: courseRaw.courseCode,
      categoryCode: courseRaw.category?.code ?? null,
      categoryName: courseRaw.category?.nameEnglish ?? null,
      durationType: courseRaw.durationType,
      durationValue: courseRaw.durationValue,
      basePrice: showPricing && pricing?.basePrice ? pricing.basePrice.toString() : null,
      taxPercentage: showPricing && pricing?.taxPercentage ? pricing.taxPercentage.toString() : null,
      currency: showPricing && pricing?.currency ? pricing.currency : null,
      imageUrl: courseRaw.bannerImage ?? null,
      showPricingPublicly: showPricing,
      hasPracticalInstruction: !!courseRaw.hasPracticalInstruction,
      practicalTestingDescription: courseRaw.practicalTestingDescription ?? null,
      metaTitle: courseRaw.metaTitle ?? null,
      metaDescription: courseRaw.metaDescription ?? null,
      metaKeywords: courseRaw.metaKeywords ?? null,
      syllabusOutline: courseRaw.syllabusOutline ?? null,
      categoryHierarchy,
      batches,
    };
  }

  async getCourseBySlug(slug: string): Promise<PublicCourseDetail | null> {
    const courses = await this.getPublishedCourses({ page: 1, limit: 200 });
    const match = courses.items.find((c) => c.slug === slug);
    if (!match) return null;
    return this.getCourseDetail(match.id);
  }

  async getCategories(): Promise<PublicCategory[]> {
    const categories = await this.prisma.courseCategory.findMany({
      where: {
        isDeleted: false,
        status: 'Active',
      },
      orderBy: [{ nameEnglish: 'asc' }],
    });

    const courseCounts = await this.prisma.course.groupBy({
      by: ['categoryId'],
      where: {
        status: 'Published',
        isDeleted: false,
        categoryId: { not: null },
      },
      _count: { id: true },
    });

    const countMap = new Map<string, number>();
    courseCounts.forEach((c) => {
      if (c.categoryId) countMap.set(c.categoryId, c._count.id);
    });

    return categories.map((cat) => ({
      id: cat.id,
      code: cat.code,
      nameEnglish: cat.nameEnglish,
      nameArabic: cat.nameArabic,
      description: cat.description ?? null,
      courseCount: countMap.get(cat.id) ?? 0,
    }));
  }

  async getCourseBatches(courseId: string): Promise<PublicBatch[]> {
    const courseRaw = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        status: 'Published',
        isDeleted: false,
      },
      include: {
        batches: {
          where: {
            status: { in: ['OpenForEnrollment', 'InProgress'] },
            isDeleted: false,
            startDate: { gte: new Date() },
          },
          orderBy: [{ startDate: 'asc' }],
          include: {
            trainers: {
              where: {
                status: 'Active',
                isDeleted: false,
              },
            },
          },
        },
      },
    }) as any;

    if (!courseRaw) return [];

    return (courseRaw.batches ?? []).map((batch: any) => {
      const primaryTrainer = batch.trainers?.find((t: any) => t.role === 'Primary') ?? batch.trainers?.[0];
      return {
        id: batch.id,
        batchCode: batch.batchCode,
        batchName: batch.batchNameEnglish,
        startDate: batch.startDate?.toISOString().split('T')[0],
        endDate: batch.endDate?.toISOString().split('T')[0],
        capacity: batch.capacity,
        currentEnrollment: batch.currentEnrollmentCount,
        availableSeats: batch.capacity - batch.currentEnrollmentCount,
        status: batch.status,
        branchName: null,
        trainerName: primaryTrainer?.trainerId ? `Trainer ${primaryTrainer.trainerId.slice(0, 8)}` : null,
        courseName: courseRaw.nameEnglish,
      };
    });
  }

  private async getCategoryHierarchy(
    categoryId: string | null | undefined
  ): Promise<Array<{ id: string; code: string; nameEnglish: string; nameArabic: string }>> {
    if (!categoryId) return [];
    const hierarchy: Array<{ id: string; code: string; nameEnglish: string; nameArabic: string }> = [];
    let currentId: string | null = categoryId;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const cat: any = await this.prisma.courseCategory.findUnique({
        where: { id: currentId, isDeleted: false },
        select: { id: true, code: true, nameEnglish: true, nameArabic: true, parentCategoryId: true },
      });
      if (!cat) break;
      hierarchy.unshift({
        id: cat.id,
        code: cat.code,
        nameEnglish: cat.nameEnglish,
        nameArabic: cat.nameArabic,
      });
      currentId = cat.parentCategoryId;
    }
    return hierarchy;
  }

  private generateSlug(courseCode: string, nameEnglish: string): string {
    const base = nameEnglish
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    return base || courseCode.toLowerCase();
  }
}
