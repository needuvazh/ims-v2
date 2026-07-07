import { del } from '@vercel/blob';
import { StorageProvider } from '../domain/ports';

export class VercelBlobStorageProvider implements StorageProvider {
  private token: string;

  constructor() {
    this.token = process.env.BLOB_READ_WRITE_TOKEN || '';
  }

  async generateUploadUrl(fileName: string, mimeType: string): Promise<{ url: string; fileKey: string }> {
    // Vercel Blob doesn't generate pre-signed upload URLs in the same way as S3.
    // In server-side uploads, we use put() directly. We return a placeholder here for interface compliance.
    const fileKey = `uploads/${Date.now()}-${fileName}`;
    return {
      url: `/api/v1/documents/upload-placeholder`,
      fileKey,
    };
  }

  async generateSignedDownloadUrl(fileKey: string, expirySeconds: number): Promise<string> {
    // Vercel Blob URLs are public by default. Return the file URL directly.
    return fileKey;
  }

  async deleteFile(fileKey: string): Promise<void> {
    if (!fileKey.startsWith('http')) {
      // If it is not a full URL, it might not be a vercel blob URL.
      return;
    }
    await del(fileKey, {
      token: this.token,
    });
  }
}
