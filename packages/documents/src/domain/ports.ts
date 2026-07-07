import { OwnerType } from './document';

export interface StorageProvider {
  generateUploadUrl(fileName: string, mimeType: string): Promise<{ url: string; fileKey: string }>;
  generateSignedDownloadUrl(fileKey: string, expirySeconds: number): Promise<string>;
  deleteFile(fileKey: string): Promise<void>;
}

export interface OwnerResolver {
  resolveOwnerBranch(ownerId: string, ownerType: OwnerType): Promise<string>;
  validateOwnerExists(ownerId: string, ownerType: OwnerType): Promise<boolean>;
}
