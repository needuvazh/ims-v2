export interface TrainerAssignmentReader {
  getPrimaryTrainerForBatch(batchId: string): Promise<{
    trainerId: string;
    trainerName: string;
    role: string;
  } | null>;

  getTrainerIdsForBatch(batchId: string): Promise<string[]>;
}
