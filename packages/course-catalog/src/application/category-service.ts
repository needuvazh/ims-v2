import { PrismaClient, Prisma } from '@prisma/client';
import { ICourseCategoryRepository } from '../domain/repositories';
import { InvalidCategoryHierarchy } from '../domain/errors';
import { createUuid } from '@ims/shared-kernel';
import { randomUUID } from 'crypto';

export class CategoryService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly categoryRepository: ICourseCategoryRepository
  ) {}

  async createCategory(input: any, actorId?: string, tx?: Prisma.TransactionClient) {
    const execute = async (activeClient: Prisma.TransactionClient) => {
      // Check duplicate code
      const existing = await this.categoryRepository.findByCode(input.code, activeClient);
      if (existing) {
        throw new Error('ERR_CRS_DUPLICATE_CATEGORY_CODE');
      }

      // Cyclic parent check
      if (input.parentCategoryId) {
        const parent = await this.categoryRepository.findById(input.parentCategoryId, activeClient);
        if (!parent) {
          throw new Error('ERR_CRS_PARENT_CATEGORY_NOT_FOUND');
        }
      }

      const categoryId = createUuid(randomUUID());
      const category = await this.categoryRepository.create(
        {
          ...input,
          id: categoryId,
          createdBy: actorId,
        },
        activeClient
      );

      // Audit Log
      await activeClient.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'CourseCatalog',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'CourseCategory',
          entityId: category.id,
          action: 'Create',
          newValue: {
            code: category.code,
            nameEnglish: category.nameEnglish,
            parentCategoryId: category.parentCategoryId,
          },
        },
      });

      return category;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async listCategories(tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return this.categoryRepository.findAll(client);
  }

  async updateCategory(id: string, input: any, version: number, actorId?: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    
    const execute = async (activeClient: Prisma.TransactionClient) => {
      const category = await this.categoryRepository.findById(id, activeClient);
      if (!category) {
        throw new Error('ERR_CRS_CATEGORY_NOT_FOUND');
      }

      // Check cyclic category loop
      if (input.parentCategoryId) {
        const hasCycleResult = await this.hasCycle(id, input.parentCategoryId, activeClient);
        if (hasCycleResult) {
          throw new InvalidCategoryHierarchy();
        }
      }

      const updated = await this.categoryRepository.update(id, input, version, activeClient);

      // Audit Log
      await activeClient.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'CourseCatalog',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'CourseCategory',
          entityId: id,
          action: 'Update',
          oldValue: {
            nameEnglish: category.nameEnglish,
            parentCategoryId: category.parentCategoryId,
          },
          newValue: {
            nameEnglish: updated.nameEnglish,
            parentCategoryId: updated.parentCategoryId,
          },
        },
      });

      return updated;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  private async hasCycle(
    categoryId: string,
    targetParentId: string,
    client: Prisma.TransactionClient
  ): Promise<boolean> {
    if (categoryId === targetParentId) {
      return true;
    }
    let currentParentId: string | null = targetParentId;
    const visited = new Set<string>();

    while (currentParentId) {
      if (visited.has(currentParentId)) {
        return true;
      }
      visited.add(currentParentId);

      if (currentParentId === categoryId) {
        return true;
      }

      const parent: { parentCategoryId: string | null } | null = await client.courseCategory.findUnique({
        where: { id: currentParentId },
        select: { parentCategoryId: true },
      });

      if (!parent) {
        break;
      }
      currentParentId = parent.parentCategoryId;
    }
    return false;
  }
}
