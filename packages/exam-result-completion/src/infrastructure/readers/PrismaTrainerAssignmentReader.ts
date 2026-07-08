import { PrismaClient } from '@prisma/client';
import { TrainerAssignmentReader } from '../../domain/interfaces/TrainerAssignmentReader';

export class PrismaTrainerAssignmentReader implements TrainerAssignmentReader {
  constructor(private readonly prisma: PrismaClient) {}

  async getPrimaryTrainerForBatch(batchId: string): Promise<{
    trainerId: string;
    trainerName: string;
    role: string;
  } | null> {
    const batchTrainer = await this.prisma.batchTrainer.findFirst({
      where: {
        batchId,
        role: 'Primary',
        status: 'Active',
        isDeleted: false,
      },
    });

    if (!batchTrainer) {
      return null;
    }

    const trainerProfile = await this.prisma.trainerProfile.findUnique({
      where: { id: batchTrainer.trainerId },
      include: {
        person: true,
      },
    });

    return {
      trainerId: batchTrainer.trainerId,
      trainerName: trainerProfile?.person
        ? `${trainerProfile.person.firstName} ${trainerProfile.person.lastName}`
        : '',
      role: batchTrainer.role,
    };
  }

  async getTrainerIdsForBatch(batchId: string): Promise<string[]> {
    const batchTrainers = await this.prisma.batchTrainer.findMany({
      where: {
        batchId,
        status: 'Active',
        isDeleted: false,
      },
      select: {
        trainerId: true,
      },
    });

    return batchTrainers.map((bt) => bt.trainerId);
  }
}
